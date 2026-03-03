import axios from "axios";

const BASE_URL = "http://localhost:9090/api";

export const API = axios.create({
  baseURL: BASE_URL,
});

