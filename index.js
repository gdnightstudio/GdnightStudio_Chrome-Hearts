import HTML_CONTENT from "./index.html"; 

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (!env.DB) {
        throw new Error("KV Namespace 'DB' 沒有綁定！請檢查設定。");
      }

      // --- GET：拿取資料 ---
      if (request.method === "GET" && url.pathname === "/api/products") {
        let data = await env.DB.get("stock");
        if (!data) data = "[]";
        return new Response(data, { 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          } 
        });
      }

      // --- POST：儲存資料 ---
      if (request.method === "POST" && url.pathname === "/api/products") {
        const body = await request.text();
        try {
          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed)) throw new Error("存入的資料格式錯誤");
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid JSON format" }), { 
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        await env.DB.put("stock", body);
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // --- 🚀 新增：POST 上傳圖片到 R2 ---
      if (request.method === "POST" && url.pathname === "/api/upload") {
        if (!env.IMAGE_BUCKET) {
          return new Response(JSON.stringify({ error: "R2 Bucket 未綁定" }), { status: 500 });
        }
        
        const formData = await request.formData();
        const file = formData.get("file");
        if (!file) {
          return new Response(JSON.stringify({ error: "找不到上傳的檔案" }), { status: 400 });
        }

        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${extension}`;
        
        await env.IMAGE_BUCKET.put(filename, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type }
        });

        const imageUrl = `/api/images/${filename}`;
        return new Response(JSON.stringify({ success: true, url: imageUrl }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      // --- 🚀 新增：GET 讀取 R2 圖片 ---
      if (request.method === "GET" && url.pathname.startsWith("/api/images/")) {
        if (!env.IMAGE_BUCKET) return new Response("R2 未設定", { status: 500 });
        
        const filename = url.pathname.replace("/api/images/", "");
        const object = await env.IMAGE_BUCKET.get(filename);

        if (object === null) {
          return new Response("圖片不存在 Image Not Found", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000"); // 快取 1 年

        return new Response(object.body, { headers });
      }

      // --- 顯示網頁 ---
      return new Response(HTML_CONTENT, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });

    } catch (error) {
      console.error("Worker Error:", error);
      if (request.url.includes("/api/")) {
         return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
         });
      }
      return new Response("Server Error: " + error.message, { status: 500 });
    }
  }
};
