import { app, ipcMain, Menu, dialog } from 'electron'

// set userData Path on portable version
import './portable'

// set defaults of environment variables
import 'dotenv/config'
process.env.TABBY_PLUGINS ??= ''
process.env.TABBY_CONFIG_DIRECTORY ??= app.getPath('userData')


import 'v8-compile-cache'
import 'source-map-support/register'
import './sentry'
import './lru'
import { parseArgs } from './cli'
import { Application } from './app'
import electronDebug = require('electron-debug')
import { loadConfig } from './config'


const argv = parseArgs(process.argv, process.cwd())

// eslint-disable-next-line @typescript-eslint/init-declarations
let configStore: any

try {
    configStore = loadConfig()
} catch (err) {
    dialog.showErrorBox('Could not read config', err.message)
    app.exit(1)
}

process.mainModule = module

let deeplinkUrl = null
if (!app.isDefaultProtocolClient('m2mrem')) {
    app.setAsDefaultProtocolClient('m2mrem')
}

const application = new Application(configStore)

if (process.platform === 'darwin') {
    app.on('open-url', function(event, url) {
        event.preventDefault()
        deeplinkUrl = url
        if (app.isReady) {
            application.broadcast('deeplink', deeplinkUrl)
        }
    })
}

ipcMain.on('app:new-window', () => {
    application.newWindow()
})

process.on('uncaughtException' as any, err => {
    console.log(err)
    application.broadcast('uncaughtException', err)
})

if (argv.d) {
    electronDebug({
        isEnabled: true,
        showDevTools: true,
        devToolsMode: 'undocked',
    })
}

app.on('activate', async () => {
    if (!application.hasWindows()) {
        application.newWindow()
    } else {
        application.focus()
    }
})

app.on('second-instance', async (_event, newArgv, cwd) => {
    application.handleSecondInstance(newArgv, cwd)
})

if (!app.requestSingleInstanceLock()) {
    app.quit()
    app.exit(0)
}

app.on('ready', async () => {
    if (process.platform === 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([
            {
                label: 'New window',
                click () {
                    this.app.newWindow()
                },
            },
        ]))
    }

    application.init()

    const window = await application.newWindow({ hidden: argv.hidden })
    await window.ready
    if (deeplinkUrl) {
        application.broadcast('deeplink', deeplinkUrl)
    } else {
        window.passCliArguments(process.argv, process.cwd(), false)
    }
    window.focus()
})
