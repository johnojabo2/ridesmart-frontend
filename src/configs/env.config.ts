import { IEnvConfig } from "../interfaces";

// Get NODE_ENV from window (runtime) or fallback to import.meta.env (build time for dev)
const getNodeEnv = (): string => {
  if (typeof window !== 'undefined' && window.__ENV__) {
    return window.__ENV__.NODE_ENV || 'production';
  }
  return (import.meta.env.NODE_ENV as string) || 'development';
};

const ENV = getNodeEnv();

export const envConfig: IEnvConfig = {
  test: ENV === "test",
  dev: ENV === "development",
  prod: ENV === "production",
};
