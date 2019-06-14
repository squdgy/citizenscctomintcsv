const parse = require('csv-parse');
const transform = require('stream-transform');
const stringify = require('csv-stringify')
const fs = require('fs'); 
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');

const optionDefinitions = [{
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: 'Display this usage guide.'
}, {
    name: 'src',
    alias: 's',
    type: String,
    description: 'The input CSV file to process',
    defaultValue: 'source.csv',
    typeLabel: '<CSV source file>'
}, {
    name: 'dest',
    alias: 'd',
    type: String,
    description: 'The output CSV file to generate',
    defaultValue: 'destination.csv',
    typeLabel: '<CSV destination file>' }];    

const options = commandLineArgs(optionDefinitions);

if (options.help) {
    const usage = commandLineUsage([{
        header: 'Typical Example',
        content: ['nodejs index.js', 'nodejs index.js -s bankstyleexport.csv -d mintstyleexport.csv']
    }, {
        header: 'Options',
        optionList: optionDefinitions
    },{
        content: 'Project home: {underline https://github.com/squdgy/citizenscctomintcsv}'
    }]);
    console.log(usage);
    process.exit();
}

// constants
const ACCOUNT_NAME = 'Citizens Bank Credit Card';

const SRC_AMOUNT = 'Amount';
const SRC_CATEGORY = 'Merchant Category Description';
const SRC_DATE = 'Date';
const SRC_NAME = 'Merchant Name';

const sourceHeaders = [SRC_DATE, 'Activity Type', SRC_NAME, SRC_CATEGORY, SRC_AMOUNT, 'Rewards'];
const destinationHeaders = ['Date', 'Description', 'Original Description', 'Amount', 'Transaction Type', 'Category', 'Account Name', 'Labels', 'Notes'];
const sourceToDestination = [SRC_DATE, SRC_NAME, SRC_NAME, SRC_AMOUNT, ':X', SRC_CATEGORY, ':A', '', ''];

// format of source file
const parser = parse({
  delimiter: ',',
  headers: sourceHeaders
});

// options for destination file
const stringifier = stringify({
    header: true,
    escape: '\'',
    columns: destinationHeaders
});

// rules for converting input rows to output rows
const transformer = transform((record, callback) => {
    if (record[0] === sourceHeaders[0]) {
        return null;
    } else {
        //console.log(JSON.stringify(record));
        transformedRecord = [];
        sourceToDestination.forEach(header => {
            //console.log(header);
            if (header === ':X') {
                const amountIdx = sourceHeaders.indexOf(SRC_AMOUNT);
                transformedRecord.push(record[amountIdx] < 0 ? 'credit' : 'debit');
            } else if (header === ':A') {
                transformedRecord.push(ACCOUNT_NAME);    
            } else if (header === '') {
                transformedRecord.push('');    
            } else {
                const idx = sourceHeaders.indexOf(header);
                let value = record[idx];
                if (header == SRC_DATE) {
                    const date = new Date(value);
                    const year = date.getFullYear() - 2000;
                    const month = date.getMonth() + 1;
                    const day = date.getDate();
                    value = `${month}/${day}/${year}`;
                }
                transformedRecord.push(value);    
            }
        });
        //console.log(JSON.stringify(transformedRecord));
        callback(null, transformedRecord);
    }
}, {
  parallel: 20
});

// MAIN:
fs.createReadStream(options.src)
    .pipe(parser)
    .pipe(transformer)
    .pipe(stringifier)
    .pipe(fs.createWriteStream(options.dest));

