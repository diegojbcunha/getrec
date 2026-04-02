// API client leveiro para comunicação com /api
const api = {
  base: "/api",
  async request(path, method = "GET", body) {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (body !== undefined) options.body = JSON.stringify(body);

    const res = await fetch(`${this.base}/${path}`, options);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || `API error ${res.status}`);
    }
    return data;
  },

  get(path) {
    return this.request(path, "GET");
  },
  post(path, body) {
    return this.request(path, "POST", body);
  },
  put(path, body) {
    return this.request(path, "PUT", body);
  },
  delete(path) {
    return this.request(path, "DELETE");
  },
};
