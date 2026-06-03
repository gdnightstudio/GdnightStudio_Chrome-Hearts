import HTML_CONTENT from "./index.html"; // 修正為小寫 import

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // --- 檢查 KV 是否正確綁定 ---
      if (!env.DB) {
        throw new Error("KV Namespace 'DB' 沒有綁定！請檢查 Cloudflare 設定。");
      }

      // --- GET：拿取資料 ---
      if (request.method === "GET" && url.pathname === "/api/products") {
        let data = await env.DB.get("stock");
        
        // 防呆：如果沒有資料，強制回傳空陣列
        if (!data) {
          data = "[]";
        }

        return new Response(data, { 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" // 防止潛在跨域問題
          } 
        });
      }

      // --- POST：儲存資料 ---
      if (request.method === "POST" && url.pathname === "/api/products") {
        const body = await request.text();
        
        // 防護機制：驗證進來的資料是不是合法的 JSON 陣列
        try {
          const parsed = JSON.parse(body);
          if (!Array.isArray(parsed)) {
            throw new Error("存入的資料格式錯誤，必須是陣列 (Array)");
          }
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

      // --- 顯示網頁 ---
      return new Response(HTML_CONTENT, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });

    } catch (error) {
      // 捕捉任何 Worker 內部錯誤，確保回傳 JSON 格式而不是 HTML
      // 這樣前端最多只會顯示空清單，而不會整個白畫面當機
      console.error("Worker Error:", error);
      
      // 如果是 API 請求出錯，回傳 JSON 錯誤
      if (request.url.includes("/api/products")) {
         return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
         });
      }
      
      // 如果是網頁崩潰，才回傳文字
      return new Response("Server Error: " + error.message, { status: 500 });
    }
  }
};
