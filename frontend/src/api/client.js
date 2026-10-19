export async function request(path, body) {
  const response = await fetch(`/api/${path}`, body === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'The local server could not complete the request.');
  return data;
}
