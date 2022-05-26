const fs_ = require('fs');
const path_ = require('path');

const { ManifestManager } = require('../lib/mppm');

/*
const parseJarName = function (inStr) {
    const parsedFilename = path_.parse(inStr);
    const values = parsedFilename.name.split('-')
    if ( values.length < 3 ) {
        const modVersion = values.pop();
        const modName = values[0];
        return {
            modVersion,
            modName
        }
    }
    const buildNumber = values.slice(-1)[0].length < 4 ? values.pop() : null;
    const modVersion = values.pop();
    const mcVersion = values.pop();
    const modName = values.join('-');
    return {
        modVersion,
        mcVersion,
        modName,
        ...(buildNumber ? { buildNumber } : {})
    }
    // const parts = inStr.split('-');
}
*/

const inServer = {};
const inClient = {};

const populateSeen = async function (set, dir) {
    const ls = await fs_.promises.readdir(dir)
    for ( const name of ls ) {
        set[name] = true;
    }
}

const modlist = [];

const main = async function () {

    const args = process.argv.slice(2);
    if ( args.length < 2 ) {
        console.error('Usage: node modlist_generator <clientModsDir> <serverModsDir> [<overlapModsDir>]');
        process.exit(1);
    }

    const mm = new ManifestManager();
    await mm.load();

    const config = {
        clientModsDir: path_.resolve(args[0]),
        serverModsDir: path_.resolve(args[1]),
        ...(args.length >= 3 ? { overlapModsDir: args[2] } : {}),
    };

    await populateSeen(inServer, config.serverModsDir);
    await populateSeen(inClient, config.clientModsDir);
    if ( config.hasOwnProperty('overlapModsDir') ) {
        await populateSeen(inServer, config.overlapModsDir);
        await populateSeen(inClient, config.overlapModsDir);
    }

    const f1 = (set, prop) => {
        for ( const k in set ) {
            let entry = modlist.find(entry => entry.file === k);
            if ( ! entry ) {
                entry = { file: k };
                modlist.push(entry);
            }
            entry[prop] = true;
        }
    };
    f1(inServer, 'server');
    f1(inClient, 'client');

    await mm.setPromptOverwrite('modlist', modlist);
};

if ( require.main === module ) main().then(() => {
    process.exit(0);
}).catch(e => { throw e; });
