# POS Guestbook
**POS Guestbook** is a simple tool to manage guestbooks from various POS platforms.

## Features: 
It contains 2 npm scripts that can be run from the cli or ideally a cron.
1. export 
    - export will login as a user and download the guestbook from the POS
    - In the case of toast, this triggers a report that will be emailed to the user's inbox
2. process-guestbook
    - process-guestbook will take the downloaded and zipped guestbook .csv and process it
    - This CSV will be persisted to a database (or file in the case of this demo) and stored
    - Only guests with a valid email and/or phone number will be stored


## Installation:
- `npm i`
- `npx playwright install chromium` (If you want to use webkit/firefox or anything else, install that too)
- You will also need a creds.json file in the following format:
```json
[
    {
        "username": "realuser@test.com",
        "password": "abc123",
        "pos": "toast",
    }
]
```

## Current Limitations:
- Only Toast is supported at the moment
- Only CSV is supported as the output format
- POS reports need to be mapped manually to our definition of a guest
