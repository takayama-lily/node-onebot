"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const filepath = path_1.default.join(__dirname, "../../../data/plugins/onebot/config.json");
config_1.createIfNotExists(filepath);
