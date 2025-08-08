const resultList = document.getElementById("resultList");
const selectedList = document.getElementById("selectedList");
const table2024 = document.querySelector("#table2024 tbody");
const chartCanvas = document.getElementById("chart2025");
const searchInput = document.getElementById("productName");
const searchBtn = document.getElementById("searchBtn");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");

let allProducts = new Map();
let selectedProducts = new Set();
let chart = null;
const pageSize = 100;

searchBtn.addEventListener("click", searchProduct);
searchInput.addEventListener("keypress", e => {
  if (e.key === "Enter") searchProduct();
});
resetBtn.addEventListener("click", resetAll);
exportBtn.addEventListener("click", exportToExcel);

function resetAll() {
  allProducts.clear();
  selectedProducts.clear();
  resultList.innerHTML = "";
  selectedList.innerHTML = "";
  table2024.innerHTML = "";
  if (chart) chart.destroy();
  chart = null;
  searchInput.value = "";
}

async function fetchPage(productName, startIdx) {
  const endIdx = startIdx + pageSize - 1;
  const url = `/api/search?productName=${encodeURIComponent(productName)}&startIdx=${startIdx}&endIdx=${endIdx}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "서버 호출 오류");
    }
    const data = await res.json();
    return data.I0320?.row || [];
  } catch (err) {
    console.error("API 호출 오류:", err);
    alert(err.message || "서버 호출 중 오류가 발생했습니다.");
    return [];
  }
}

async function fetchAllPages(productName) {
  let startIdx = 1;
  let results = [];

  while (true) {
    resultList.innerHTML = `<li>조회 중... ${results.length}개 이상 수집됨</li>`;
    const rows = await fetchPage(productName, startIdx);
    results = results.concat(rows);
    if (rows.length < pageSize) break;
    startIdx += pageSize;
  }

  return results;
}

async function searchProduct() {
  const query = searchInput.value.trim();
  if (query.length < 2) {
    alert("2글자 이상 입력해주세요.");
    return;
  }

  resultList.innerHTML = "<li>조회 중...</li>";
  const items = await fetchAllPages(query);
  if (items.length === 0) {
    resultList.innerHTML = "<li>검색 결과가 없습니다.</li>";
    return;
  }

  items.forEach(item => {
    const name = item.PDT_NM;
    const date = item.MNFT_DAY;
    if (!name || !date) return;

    const year = parseInt(date.slice(0, 4));
    const month = parseInt(date.slice(4, 6));

    if (year < 2024) return;

    if (!allProducts.has(name)) {
      allProducts.set(name, { 2024: 0, 2025: Array(12).fill(0) });
    }

    const productData = allProducts.get(name);

    if (year === 2024) productData[2024]++;
    else if (year === 2025 && month >= 1 && month <= 12) productData[2025][month - 1]++;
  });

  const productNames = [...new Set(items.map(i => i.PDT_NM).filter(Boolean))];

  productNames.sort((a, b) => {
    const sum = arr => arr.reduce((a, b) => a + b, 0);
    return sum(allProducts.get(b)?.[2025] || []) - sum(allProducts.get(a)?.[2025] || []);
  });

  resultList.innerHTML = "";
  productNames.forEach(name => {
    const li = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `chk_${name}`;
    checkbox.checked = selectedProducts.has(name);

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedProducts.add(name);
      else selectedProducts.delete(name);
      renderSelectedList();
      renderTable();
      renderChart();
    });

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = name;

    li.appendChild(checkbox);
    li.appendChild(label);
    resultList.appendChild(li);
  });

  renderSelectedList();
  renderTable();
  renderChart();
}

function renderSelectedList() {
  selectedList.innerHTML = "";
  selectedProducts.forEach(name => {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.addEventListener("change", () => {
      selectedProducts.delete(name);
      const mainCheckbox = document.getElementById(`chk_${name}`);
      if (mainCheckbox) mainCheckbox.checked = false;
      renderSelectedList();
      renderTable();
      renderChart();
    });

    const label = document.createElement("label");
    label.textContent = name;

    li.appendChild(checkbox);
    li.appendChild(label);
    selectedList.appendChild(li);
  });
}

function renderTable() {
  table2024.innerHTML = "";
  selectedProducts.forEach(name => {
    const data = allProducts.get(name);
    if (!data) return;
    const row = document.createElement("tr");
    row.innerHTML = `<td>${name}</td><td>${data[2024]}</td>`;
    table2024.appendChild(row);
  });
}

function renderChart() {
  if (chart) chart.destroy();

  const datasets = [...selectedProducts].map(name => {
    const data = allProducts.get(name);
    if (!data) return null;

    const color = getColor(name);
    return {
      label: name,
      data: data[2025],
      borderColor: color,
      backgroundColor: color + "88",
      fill: false,
      tension: 0.2,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  }).filter(Boolean);

  if (datasets.length === 0) return;

  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],
      datasets
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        tooltip: { mode: "index", intersect: false }
      },
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
          title: { display: true, text: "생산횟수" }
        },
        x: {
          title: { display: true, text: "월" }
        }
      }
    }
  });
}

function getColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 50%)`;
}

function exportToExcel() {
  if (selectedProducts.size === 0) {
    alert("선택된 품목이 없습니다.");
    return;
  }

  const wsData = [
    ["품목명", "2024년 생산 횟수", ...Array.from({ length: 12 }, (_, i) => `2025년 ${i + 1}월`)]
  ];

  selectedProducts.forEach(name => {
    const data = allProducts.get(name);
    if (!data) return;
    wsData.push([name, data[2024], ...data[2025]]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "생산현황");
  XLSX.writeFile(wb, "생산현황.xlsx");
}
