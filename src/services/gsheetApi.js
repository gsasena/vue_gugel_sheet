//https://script.google.com/macros/s/AKfycbwGTlj6pO8rGT2ZtjwF5FL6fnQyYv_bYcsRgopz5m52YfIucRFTCWEci-Yq-6LLeI76/exec

export async function getSheetData() {
  const url = "https://script.google.com/macros/s/AKfycbwGTlj6pO8rGT2ZtjwF5FL6fnQyYv_bYcsRgopz5m52YfIucRFTCWEci-Yq-6LLeI76/exec";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed fetch data");
    return await res.json();
  } catch (err) {
    console.error("Error fetching sheet:", err);
    return [];
  }
}
