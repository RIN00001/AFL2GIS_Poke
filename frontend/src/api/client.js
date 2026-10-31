export async function request(path, body) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try {
    const options=body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
    const response=await fetch(`/api/${path}`,{...options,signal:controller.signal});
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(typeof data?.detail==='string'?data.detail:'The server could not finish this action. Please try again.');
    if(!data)throw new Error('The server returned an unreadable response.');
    return data;
  }catch(error){
    if(error.name==='AbortError')throw new Error('Connection timed out. Check the local Python server.');
    throw error;
  }finally{clearTimeout(timer);}
}
