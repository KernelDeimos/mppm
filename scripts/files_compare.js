const fs = require('fs');
const path_ = require('path');

// let a = fs.readFileSync('files.txt').toString();
// let b = fs.readFileSync('mppm.json').toString();
// let c = fs.readFileSync('nic-mods-dir.txt').toString();

// const sources = [
//     'alex:nix:files.txt',
//     'eric:mppm:mppm.json',
//     'nic:win:nic-mods-dir.txt'
// ]

const sources = process.argv.slice(2);

// b = JSON.parse(b);

const sourceTypes = {
    nix: str => str.split('\n'),
    win: str => str.split('\r\n').map(v => v.split(' ').slice(-1)[0]),
    mppm: str => JSON.parse(str).modlist.map(v => v.file),
};

// a = a.split('\n');
// b = b.modlist.map(v => v.file);
// c = c.split('\r\n').map(v => v.split(' ')[0]);


const groups = {};
const all = {};
all.jarMap = {};

const parse_jar_name = jarName => {
    return {
        probablyModName: jarName.split('-')[0]
    };
}

const marshal_items = (group, fileList) => {
    for ( const fileName of fileList ) {
        const probablyModName = parse_jar_name(fileName).probablyModName;
        const o = { fileName };
        group.jarMap[fileName] = o;
        group.jarList.push(fileName);
        group.modToJar[probablyModName] = o;
        all.jarMap[fileName] = o;
    }
};

for ( const source of sources ) {
    const args = source.split(':');
    if ( args.length < 3 ) throw new Error('invalid parameters');

    const name = args.shift();
    const sourceType = args.shift();
    const fileName = args.shift();
    const filePath = path_.resolve(fileName);

    const str = fs.readFileSync(filePath).toString();
    const list = sourceTypes[sourceType](str);

    groups[name] = { jarMap: {}, jarList: [], modToJar: {} };

    marshal_items(groups[name], list)
}

Object.defineProperty(all, 'jarList', {
    get () {
        return Object.keys(all.jarMap);
    }
})

for ( let jarName of all.jarList ) {
    const doesNotHave = [];
    const hasSimilar = [];
    for ( let groupKey in groups ) {
        if ( ! groups[groupKey].jarMap.hasOwnProperty(jarName) ) {
            doesNotHave.push(groupKey);
            const probablyModName = parse_jar_name(jarName).probablyModName;
            if ( groups[groupKey].modToJar.hasOwnProperty(probablyModName) ) {
                hasSimilar.push({
                    groupKey,
                    fileName: groups[groupKey].modToJar[probablyModName].fileName
                });
            }
        }
    }
    if ( doesNotHave.length > 0 ) {
        console.log(`mod '${jarName}' is missing for: ${doesNotHave.join(', ')}`);
        for ( let similar of hasSimilar ) {
            console.log(` -- ${similar.groupKey} has ${similar.fileName}`)
        }
    }
}
