import "./index.css";
import { mount } from "./lib/mount";
import { appConfig } from "./app.config";

document.documentElement.lang = appConfig.lang;
document.documentElement.dir = appConfig.dir;

const container = document.getElementById("root");
if (!container) throw new Error("#root element not found in index.html");

mount(container);
