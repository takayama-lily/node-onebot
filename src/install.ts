import path from "path"
import { createIfNotExists } from "./config"
const filepath = path.join(__dirname, "../../../data/plugins/onebot/config.json")
createIfNotExists(filepath)
