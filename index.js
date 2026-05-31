
import HTML_CONTENT from "./index.html";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 拿取資料
    if (request.method === "GET" && url.pathname === "/api/products") {
      const data = await env.DB.get("stock") || "[]";
      return new Response(data, { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // 儲存資料
    if (request.method === "POST" && url.pathname === "/api/products") {
      const body = await request.text();
      await env.DB.put("stock", body);
      return new Response("OK");
    }

    // 顯示網頁
    return new Response(HTML_CONTENT, {
      headers: { "Content-Type": "text/html;charset=UTF-8" }
    });
  }
};
