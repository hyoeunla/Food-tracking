import fetch from "node-fetch";

export default async function handler(req, res) {
  const { productName = "", startIdx = "1", endIdx = "100" } = req.query;

  if (productName.length < 2) {
    return res.status(400).json({ error: "productName은 2글자 이상이어야 합니다." });
  }

  const apiKey = process.env.FOOD_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API 키가 설정되어 있지 않습니다." });
  }

  const url = `https://openapi.foodsafetykorea.go.kr/api/${apiKey}/I0320/json/${startIdx}/${endIdx}?PDT_NM=${encodeURIComponent(productName)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.error("외부 API 호출 실패", text);
      return res.status(response.status).json({ error: "외부 API 호출 실패", detail: text });
    }

    const text = await response.text();
    try {
      const data = JSON.parse(text);
      res.status(200).json(data);
    } catch (parseError) {
      console.error("외부 API 응답 JSON 파싱 실패", text);
      res.status(502).json({ error: "외부 API 응답이 JSON이 아닙니다." });
    }
  } catch (error) {
    console.error("서버 내부 오류:", error);
    res.status(500).json({ error: "서버 내부 오류" });
  }
}
