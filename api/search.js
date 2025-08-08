import fetch from "node-fetch";

export default async function handler(req, res) {
  const { productName = "", startIdx = "1", endIdx = "100" } = req.query;

  if (productName.length < 2) {
    return res.status(400).json({ error: "productName은 2글자 이상이어야 합니다." });
  }

  const apiKey = process.env.FOOD_API_KEY;
  const url = `https://openapi.foodsafetykorea.go.kr/api/${apiKey}/I0320/json/${startIdx}/${endIdx}?PDT_NM=${encodeURIComponent(productName)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: "외부 API 호출 실패" });
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "서버 내부 오류" });
  }
}
