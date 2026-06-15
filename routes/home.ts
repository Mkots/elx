import { Hono } from "@hono/hono";
import { HomePage } from "../ui/home_page.tsx";

export const homeRoute = new Hono();

homeRoute.get("/", (context) => context.html(HomePage()));
