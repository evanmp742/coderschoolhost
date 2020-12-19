const express = require('express')
const app = express()
const child_process = require('child_process')
const fs = require('fs')
const pm2 = require('pm2')
const bodyParser = require('body-parser')

app.use(bodyParser.json())
app.use(express.urlencoded())

app.get('/output.css', (req, res) => {
    res.contentType('text/css')
    res.sendFile(__dirname + '/output.css')
})

app.get('/horizontalline.css', (req, res) => {
    res.contentType('text/css')
    res.sendFile(__dirname + '/horizontalline.css')
})

app.get('/stylesheet.css', (req, res) => {
    res.contentType('text/css')
    res.sendFile(__dirname + '/stylesheet.css')
})

app.get('/success.css', (req, res) => {
    res.contentType('text/css')
    res.sendFile(__dirname + '/success.css')
})

app.get('/error.css', (req, res) => {
    res.contentType('text/css')
    res.sendFile(__dirname + '/error.css')
})

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
})

app.get('/success', (req, res) => {
    res.sendFile(__dirname + '/success.html')
})

app.get('/error', (req, res) => {
    res.sendFile(__dirname + '/error.html')
})

app.get('/projects', (req, res) => {
    res.sendFile(__dirname + '/projects.html')
})

app.get('/projectList', (req, res) => {
    fs.readdir(__dirname + '/projects', (err, files) => {
        pm2.list((err, list) => {
            const commonProjects = list.map(x => x.name)
            const runningArray = []
            for (const project of files) {
                if (commonProjects.includes(project)) {
                    runningArray.push({
                        name: project,
                        running: true
                    })
                } else {
                    runningArray.push({
                        name: project,
                        running: false
                    })
                }
            }
            res.send(runningArray)
        })
    })
})

app.post('/upload', (req, res) => {
    console.log(req.body)
    let newbody = req.body.name.replace(' ', '-')
    child_process.exec('git clone ' + req.body.url + ' projects/' + newbody, err => {
        if (err) {
            res.redirect('/error')
        } else {
            res.redirect('/success')
        }
    })
    pm2.connect((err) => {
        if (err) {
            console.error(err)
            process.exit(2)
        }

        fs.access('projects/' + newbody, err => {
            if (!err) return;
            else {
                fs.rmdir('projects/' + newbody, () => {
                    console.log('deleted')
                })
            }
        })
        
        pm2.delete(newbody, err)

        pm2.start({
            name      : newbody,
            child_process: 'npm i --save express',
            script    : 'projects/' + newbody + '/index.js',         // Script to be run
            exec_mode : 'cluster',        // Allows your app to be clustered
            instances : 1,                // Optional: Scales your app by 4
            max_memory_restart : '100M'   // Optional: Restarts your app if it reaches 100Mo
        }, function(err, apps) {
            pm2.disconnect();   // Disconnects from PM2
            if (err) throw err
        })
    })
})

app.get('/projects/:appname/:action', (req, res) => {
    console.log(req.params)
    pm2.connect((err) => {
        if (err) {
            console.error(err)
            process.exit(2)
        }

        if (req.params.action === 'start') {
            pm2.start({
                name      : req.params.appname,
                script    : `projects/${req.params.appname}/index.js`,         // Script to be run
                exec_mode : 'cluster',        // Allows your app to be clustered
                instances : 1,                // Optional: Scales your app by 4
                max_memory_restart : '100M'   // Optional: Restarts your app if it reaches 100Mo
            }, function(err, apps) {
                pm2.disconnect();   // Disconnects from PM2
                if (err) throw err
            })
        } else {
            pm2.delete(req.params.appname, err)
        }

        if (err) {
            res.end('error')
        } else {
            res.end('success')
        }
    })
})

// app.post('/stop', (req, res) => {
//     pm2.connect((err) => {
//         if (err) {
//             console.error(err)
//             process.exit(2)
//         }

//         pm2.delete('app-name', err)
//     })
// })

const port = 8081
// const port = process.argv[2]
// fs.writeFileSync('port.txt', port)

app.listen(port, () => {
    console.log(`website active on ${port}`)
})