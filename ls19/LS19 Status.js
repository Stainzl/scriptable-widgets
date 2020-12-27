// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: signal;
const widgetSize = "small"

let processedArgs = {
    url: "",
    cacheId: "",
    widgetSize: "",
    lang: ""
}

let serverStats = {
    running: false,
    fromCache: false,
    game: "",
    version: "",
    server: "",
    name: "",
    mapName: "",
    players: {
        capacity: -1,
        numUsed: 0,
        players: [{
            name: "",
            isUsed: false,
            isAdmin: false,
            uptime: 0
        }]
    }
}

const textsMultiLang = {
    de: {
        players: "Spieler",
        map: "Map",
        server: "Server",
        version: "Version",
        unused: "Frei",
        unreachable: "Server nicht gefunden",
        stopped: "Der Server ist offline",
        since: "seit",
        decimal: ",",
        one: "einer",
        times: {
            minute: "min",
            minutes: "min",
            hour: "Stunde",
            hours: "Stunden"
        },
        noCache: "Es wurde noch kein Cache erstellt und der Server ist nicht gestartet!",
        noConfig: "Das Widget wurde nicht korrekt konfiguriert!",
    },
    en: {
        players: "Players",
        map: "Map",
        server: "Server",
        version: "Version",
        unused: "Empty",
        unreachable: "The server is not reachable",
        stopped: "The server is offline",
        since: "since",
        decimal: ",",
        one: "one",
        times: {
            minute: "min",
            minutes: "min",
            hour: "hour",
            hours: "hours"
        },
        noCache: "No cache was created and the server isn't started!",
        noConfig: "The widget was not configured correctly!",
    }
}

let texts = textsMultiLang.en
const defaultLang = "en"

class StatusWidget {
    fileManager = new CustomFileManager()

    async init() {
        Parse.args(args.widgetParameter)
        const ui = new UI()
        const widget = new ListWidget()
        widget.setPadding(10, 10, 10, 10)

        if (processedArgs.cacheId === "" || processedArgs.url === "") {
            await ui.showError(widget, texts.noConfig)
        } else {
            try {
                await this.getServerInfo()

                await ui.createTitle(widget)
                widget.addSpacer()
                await ui.createBaseInfo(widget)
                widget.addSpacer()
                if (serverStats.running === true) {
                    await ui.createPlayers(widget)
                } else {
                    await ui.showError(widget, serverStats.running)
                }
                widget.addSpacer()
            } catch (e) {
                await ui.showError(widget, texts.noCache)
            }
        }

        if (!config.runsInWidget) {
            switch (processedArgs.widgetSize) {
                case "medium":
                    await widget.presentMedium()
                    break
                case "large":
                    await widget.presentLarge()
                    break
                default:
                    await widget.presentSmall()
            }
        } else {
            // Tell the system to show the widget.
            Script.setWidget(widget)
            Script.complete()
        }
    }

    async getServerInfo() {
        try {
            const request = new Request(processedArgs.url)
            request.timeoutInterval = 5;
            const resp = await request.loadString()
            await Parse.xml(resp).catch(() => {throw "Not Running"})
        } catch (ex) {
            this.fileManager.getBaseInfo()
            if (ex === "Not Running") {
                serverStats.running = texts.stopped
                console.warn("Server not running")
            } else {
                serverStats.running = texts.unreachable
                console.warn("Server not reachable")
            }
        }
        if (serverStats.running === true) {
            this.fileManager.saveBaseInfo().then(() => console.log("Cache created"), data2 => console.log("error: " + data2))
        }
    }
}

class UI {
    betweenFormatter = new RelativeDateTimeFormatter()

    constructor() {
        this.betweenFormatter.useNamedDateTimeStyle()
    }

    async createTitle(widget) {
        const titleRow = widget.addStack()
        titleRow.size = new Size(-1, 18)

        const titleStack = titleRow.addStack()
        const title = titleStack.addText("🚜 " + serverStats.name)
        title.font = Font.regularSystemFont(16)

        titleRow.addSpacer()

        const statusStack = titleRow.addStack()
        const status = statusStack.addText("•")
        status.font = Font.heavySystemFont(16)
        if (serverStats.running === true) {
            status.textColor = Color.green()
        } else {
            status.textColor = Color.red()
        }
        status.rightAlignText()
        if (serverStats.fromCache !== false) {
            statusStack.size = new Size(40, 18);
            statusStack.addSpacer(3)
            const between = this.betweenFormatter.string(serverStats.fromCache, new Date())
            const updated = statusStack.addText(between)
            updated.font = Font.thinSystemFont(16)
            updated.minimumScaleFactor = 0.45
        }
    }

    async createBaseInfo(widget) {
        const baseInfoRow = widget.addStack()
        const leftStack = baseInfoRow.addStack()
        leftStack.layoutVertically()

        let rightStack
        if (processedArgs.widgetSize === "small") {
            rightStack = leftStack
        } else {
            baseInfoRow.addSpacer()
            rightStack = baseInfoRow.addStack()
            rightStack.layoutVertically()
        }

        const playersStack = leftStack.addStack()
        const players = playersStack.addText(texts.players + ":")
        players.font = Font.regularSystemFont(12)
        playersStack.addSpacer()
        const playersNo = playersStack.addText(serverStats.players.numUsed + "/" + serverStats.players.capacity)
        playersNo.font = Font.regularSystemFont(12)
        if (serverStats.players.numUsed !== serverStats.players.capacity && serverStats.running === true) {
            playersNo.textColor = Color.green()
        } else {
            playersNo.textColor = Color.red()
        }

        const mapStack = rightStack.addStack()
        const map = mapStack.addText(texts.map + ":")
        map.font = Font.regularSystemFont(12)
        mapStack.addSpacer()
        const mapName = mapStack.addText(serverStats.mapName)
        mapName.font = Font.regularSystemFont(12)

        const serverStack = leftStack.addStack()
        const server = serverStack.addText(texts.server + ":")
        server.font = Font.regularSystemFont(12)
        serverStack.addSpacer()
        const serverName = serverStack.addText(serverStats.server)
        serverName.font = Font.regularSystemFont(12)

        if (processedArgs.widgetSize !== "small" || serverStats.running !== true) {
            const versionStack = rightStack.addStack()
            const version = versionStack.addText(texts.version + ":")
            version.font = Font.regularSystemFont(12)
            versionStack.addSpacer()
            const versionNo = versionStack.addText(serverStats.version)
            versionNo.font = Font.regularSystemFont(12)
        }
    }

    async createPlayers(widget) {
        const perCol = (processedArgs.widgetSize === "large") ? 8 : (processedArgs.widgetSize === "medium") ? 5 : 4
        const allPlayers = widget.addStack()
        const col1 = allPlayers.addStack()
        col1.layoutVertically()
        for (let i = 0; (i < serverStats.players.capacity && i < perCol); i++) {
            await this.createPlayer(col1, serverStats.players.players[i])
        }
        if (processedArgs.widgetSize !== "small" && serverStats.players.capacity > perCol) {
            allPlayers.addSpacer()
            const col2 = allPlayers.addStack()
            col2.layoutVertically()
            for (let i = perCol; (i < serverStats.players.capacity && i < (perCol * 2)); i++) {
                await this.createPlayer(col2, serverStats.players.players[i])
            }
            allPlayers.addSpacer()
        }
    }

    async createPlayer(col, player) {
        const playerRow = col.addStack()
        let playerName
        if (player.isUsed) {
            playerName = playerRow.addText(player.name)
            playerRow.addSpacer()
            let onlineSince = texts.since + " "
            if (player.uptime === 1) {
                onlineSince += texts.one + " " + texts.times.minute
            } else if (player.uptime < 60) {
                onlineSince += player.uptime + " " + texts.times.minutes
            } else if (Math.round(player.uptime / 60) === 1) {
                onlineSince += texts.one + " " + texts.times.hour
            } else {
                onlineSince += (Math.round(player.uptime / 60)) + " " + texts.times.hours
            }

            const playerUptime = playerRow.addText(onlineSince)
            playerUptime.font = Font.regularSystemFont(12)
        } else {
            playerName = playerRow.addText(texts.unused)
            playerRow.addSpacer()
        }
        playerName.font = Font.regularSystemFont(12)
    }

    async showError(widget, messageText) {
        const contentStack = widget.addStack()
        contentStack.addSpacer()
        const message = contentStack.addText(messageText)
        message.font = Font.regularSystemFont(14)
        message.textColor = Color.red()
        message.centerAlignText()
        contentStack.addSpacer()
    }
}

class CustomFileManager {
    fm;
    configDirectory = "ls19-status"
    configPath = ""

    constructor() {
        try {
            this.fm = FileManager.iCloud()
        } catch (e) {
            this.fm = FileManager.local()
        }
        this.configPath = this.fm.joinPath(this.fm.documentsDirectory(), '/' + this.configDirectory)
        if (!this.fm.isDirectory(this.configPath)) {
            this.fm.createDirectory(this.configPath)
        }
    }

    async saveBaseInfo() {
        const baseStats = {
            game: serverStats.game,
            version: serverStats.version,
            server: serverStats.server,
            name: serverStats.name,
            mapName: serverStats.mapName,
            capacity: serverStats.players.capacity,
            cacheDate: Date().toString()
        }
        const filename = this.getFilePath()
        return this.fm.writeString(filename, JSON.stringify(baseStats))
    }

    getBaseInfo() {
        const filename = this.getFilePath()
        if (!this.fm.fileExists(filename)) {
            throw "File does not exist"
        }
        this.fm.downloadFileFromiCloud(filename)
        const strInfo = this.fm.readString(filename)
        const info = JSON.parse(strInfo)
        serverStats.fromCache = new Date(info.cacheDate)
        serverStats.game = info.game
        serverStats.version = info.version
        serverStats.server = info.server
        serverStats.name = info.name
        serverStats.mapName = info.mapName
        serverStats.players.capacity = info.capacity
        console.warn("Loaded cache from file")
    }

    getFilePath() {
        if (processedArgs.cacheId !== "") {
            return this.fm.joinPath(this.configPath, "/" + processedArgs.cacheId + ".json")
        } else {
            throw new Error("CacheId is not set")
        }
    }
}

class Parse {
    static args(extArgs) {
        if (extArgs !== null) {
            extArgs.split(";").filter(arg => arg !== "")
                .forEach(arg => {
                    const key = arg.substr(0, arg.indexOf(':'))
                    const val = arg.substr(arg.indexOf(':') + 1)
                    processedArgs[key] = val;
                })
        }
        if (config.widgetFamily !== undefined) {
            processedArgs.widgetSize = config.widgetFamily
        } else {
            processedArgs.widgetSize = widgetSize
        }
        if (processedArgs.lang === "") {
            processedArgs.lang = Device.language()
        }
        if (!textsMultiLang.hasOwnProperty(processedArgs.lang)) {
            processedArgs.lang = defaultLang
        }
        texts = textsMultiLang[processedArgs.lang]
    }

    static async xml(xmlStatus) {
        return new Promise((resolve, reject) => {
            serverStats.players.players = []
            let isUp = true
            let isPlayer = false
            let playerId = 0
            const parser = new XMLParser(xmlStatus)
            parser.didStartElement = (name, values) => {
                if (name === "Server") {
                    if (Object.keys(values).length !== 0) {
                        serverStats.running = true
                        serverStats.game = values.game
                        serverStats.version = values.version
                        serverStats.server = values.server
                        serverStats.name = values.name
                        serverStats.mapName = values.mapName
                    } else {
                        isUp = false
                    }
                } else if (name === "Slots") {
                    if (serverStats.running) {
                        serverStats.players.capacity = values.capacity
                        serverStats.players.numUsed = values.numUsed
                    }
                } else if (name === "Player") {
                    isPlayer = true
                    serverStats.players.players.push({
                        name: "",
                        isUsed: false,
                        isAdmin: false,
                        uptime: 0
                    })
                    if (Object.keys(values).length !== 0 && values.isUsed === "true") {
                        serverStats.players.players[playerId].isAdmin = (values.isAdmin === "true")
                        serverStats.players.players[playerId].isUsed = true
                        serverStats.players.players[playerId].uptime = parseInt(values.uptime)
                    }
                }
            }
            parser.foundCharacters = str => {
                if (isPlayer) {
                    serverStats.players.players[playerId].name = str
                }
            }
            parser.didEndElement = name => {
                if (name === "Player") {
                    isPlayer = false;
                    playerId++;
                } else if (name === "Server") {
                    if (isUp) {
                        resolve()
                    } else {
                        reject()
                    }
                }
            }
            parser.parse()
        })
    }
}

await new StatusWidget().init();
