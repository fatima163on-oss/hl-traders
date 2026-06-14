export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();
    try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString();
          const body = raw ? JSON.parse(raw) : {};
          const response = await fetch("https://api.hyperliquid.xyz/info", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
          });
          const data = await response.json();
          res.status(200).json(data);
    } catch (e) {
          res.status(500).json({ error: e.message });
    }
}

export const config = { api: { bodyParser: false } };
