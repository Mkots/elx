import { Hono } from "@hono/hono";
import { HomePage } from "../ui/pages/HomePage.tsx";

export const homeRoute = new Hono();

homeRoute.get("/", (context) => context.html(HomePage()));
