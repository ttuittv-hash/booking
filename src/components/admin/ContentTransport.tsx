"use client";
import { createContext, useContext } from "react";
export type ContentRequest = (url: string, init?: RequestInit) => Promise<Response>;
export const ContentTransport = createContext<{request:ContentRequest;isPreview:boolean}>({request:(url,init)=>fetch(url,init),isPreview:false});
export function useContentTransport() { return useContext(ContentTransport); }
