
import * as admin from 'firebase-admin';
const fs = require('fs');
const fspromise = require('fs').promises;
const csv = require('fast-csv');

var serviceAccount = require('../key.json')

const mode = getMode()

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://cashmeback-messenger-default-rtdb.firebaseio.com"
});

const fileName = "data.csv"
if (!fs.existsSync(fileName)) {
    console.error("No data.csv file found")
    process.exit()
}

const data = []

let promise = new Promise((resolve, reject) => {
    fs.createReadStream(fileName)
        .pipe(csv.parse())
        .on('error', (error) => reject(error))
        .on('data', (row) => { data.push(row); })
        .on('end', (rowCount) => resolve(""));
});

async function createHeader() {
    try {
        const csvHeaders = 'number'
        await fspromise.writeFile(fileName, csvHeaders, { flag: 'a' });
    } catch (error) {
        console.error(`Got an error trying to write to a file:1`);
    }
}
async function addData(data, filename) {
    try {
        var log = "+"+data+" is in "+mode
        var file = filename+".csv"
        
        if (!fs.existsSync(file)) {
            const csvLine = `${log},${file}`
            await fspromise.writeFile(file, csvLine, { flag: 'a' });
        } else {
            const csvLine = `\n${log},${file}`
            await fspromise.writeFile(file, csvLine, { flag: 'a' });
        }
    } catch (error) {
        console.error(`Got an error trying to write to a file:2`);
    }
}
async function deleteFile(filePath) {
    try {
      await fspromise.unlink(filePath);
      console.log(`Deleted ${filePath}`);
    } catch (error) {
      console.error(`Got an error trying to delete the file:3`);
    }
}

(async () => {
    await promise.catch(error => console.error("ERROR ", error))
    var addNum;
    for (const row of data) {
        const number = Number(row[0])
        await addData(number, row[1])
        if (number) {
            let uidSnap = await admin.database().ref(`uidByPhone/+${number}`).once('value')
            addNum = number
            let uid = uidSnap.val()
            let valueToSet
            if (mode === "unlock") {
                valueToSet = null
            } else {
                valueToSet = true
            }
            const ref = admin.database().ref(`lock/${uid}`)
            if (uid) {
                await ref.set(valueToSet)
                console.log("number +"+number+" is in", mode)
            }
        }
    }
    
    // await deleteFile(fileName)
    // await createHeader()
    
    console.log("DONE!")
    process.exit()
})();


function getMode() {
    let dateArg = process.argv.filter(arg => arg.startsWith("--mode"))[0];
    if (dateArg) {
        let mode = dateArg.replace(`--mode=`, '');
        console.log("got mode ", mode);

        if (mode === "lock" || mode === "unlock") {
            return mode
        } else {
            console.log("INVALID MODE");
            process.exit();
        }

    } else {
        console.log("Please add mode using -- --mode=");
        process.exit();
    }
}