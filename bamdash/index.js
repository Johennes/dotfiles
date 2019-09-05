const fs = require('fs')
const http = require('http')
const handlebars = require('handlebars')
const os = require('os')
const path = require('path')
const request = require('request')

// Configuration

function loadConfiguration() {
    const configPath = path.join(os.homedir(), '.bam!dash.json')
    const configString = fs.readFileSync(configPath, { encoding: 'utf8' })
    return JSON.parse(configString)
}

function validateConfig(config) {
    if (!('authorization' in config)) {
        console.log('ERR No authorization setting in config')
        process.exit(1)
    }

    if (!('bamboo' in config)) {
        console.log('ERR No bamboo section in config')
        process.exit(1)
    }
    if (!('host' in config['bamboo'])) {
        console.log('ERR No bamboo.host setting in config')
        process.exit(1)
    }

    if (!('bitbucket' in config)) {
        console.log('ERR No bitbucket section in config')
        process.exit(1)
    }
    if (!('host' in config['bitbucket'])) {
        console.log('ERR No bitbucket.host setting in config')
        process.exit(1)
    }
}

const config = loadConfiguration()

// Template / Context Loading & Compilation

function loadTemplate(templatePath) {
    return fs.readFileSync(templatePath, { encoding: 'utf8' })
}

function loadContext() {
    return new Promise(async function(resolve, reject) {
        let masterResults = await bambooGetLatestFailedResults('master')
        let releaseBranch = (await bitbucketGetLatestReleaseBranch())['displayId']
        let releaseBranchResults = await bambooGetLatestFailedResults(releaseBranch)
        resolve({
            branches: [
                getBranchContext('master', masterResults, 'plan'),
                getBranchContext(releaseBranch, releaseBranchResults, 'master')
            ],
            date: getCurrentTime()
        })
    })
}

function getBranchContext(name, results, planNameKey) {
    return {
        name: name,
        failures: results.map(function(result) {
            return {
                planName: result[planNameKey]['shortName'],
                buildTime: getBuildTimeString(result['buildCompletedTime']),
                resultLink: config.bamboo.host + '/browse/' + result['buildResultKey'],
                planLink: config.bamboo.host + '/browse/' + result['plan']['key']
            }
        })
    }
}

function getBuildTimeString(buildCompletedTime) {
    const buildTime = new Date(Date.parse(buildCompletedTime))
    const minutesSinceBuild = (new Date() - buildTime) / 1000 / 60
    if (minutesSinceBuild < 60) {
        return minutesSinceBuild.toFixed() + " minutes ago"
    } else if (minutesSinceBuild / 60 < 24) {
        return (minutesSinceBuild / 60).toFixed() + " hours ago"
    }
    return (minutesSinceBuild / 60 / 24).toFixed() + " days ago"
}

function getCurrentTime() {
    const now = new Date()
    const hours = now.getHours()
    const minutes = '0' + now.getMinutes()
    const seconds = '0' + now.getSeconds()
    return hours + ":" + minutes.substr(-2) + ":" + seconds.substr(-2)
}

function injectContext(source, context) {
    var template = handlebars.compile(source)
    return template(context)
}

// Bitbucket API Access

function bitbucketGet(path) {
    console.log('GET ' + config.bitbucket.host + path)
    return new Promise(function(resolve, reject) {
        const options = {
            url: config.bitbucket.host + path + (path.includes('?') ? '&' : '?') + 'os_authType=basic',
            headers: {
                'Authorization': config.authorization,
                'Accept': 'application/json',
                'X-Atlassian-Token': 'no-check'
            }
        }
        const callback = function(error, response, body) {
            if (error || response.statusCode != 200) {
                reject(error)
            } else {
                resolve(JSON.parse(body))
            }
        }
        request(options, callback)
    })
}

async function bitbucketGetAll(path) {
    let results = []
    let offset = 0
    let count = 25

    while (true) {
        let json

        try {
            json = await bitbucketGet(path + (path.includes('?') ? '&' : '?') + 'start=' + offset + '&limit=' + count)
        } catch (error) {
            console.log('ERR Failed to get chunk ' + offset + '..' + (offset + count) + ': ' + error)
            break
        }

        results = results.concat(json['values'])
        offset += count

        if (json['isLastPage']) {
            break
        }
    }

    return results
}

async function bitbucketGetAllBranches() {
    return await bitbucketGetAll('/rest/api/1.0/projects/MOB/repos/ios/branches')
}

// Bitbucket Response Processing

async function bitbucketGetLatestReleaseBranch() {
    console.log('Getting all branches...')

    let allBranches = await bitbucketGetAllBranches()

    console.log('Determining latest release branch...')

    let releaseBranches = allBranches.filter(function(branch) {
        return branch['displayId'].startsWith('release/')
    })

    let regex = /release\/m(\d+)/;

    releaseBranches.sort(function compare(one, other) {
        let v1 = parseInt(regex.exec(one['displayId'])[1])
        let v2 = parseInt(regex.exec(other['displayId'])[1])
        return v1 < v2 ? -1 : v1 > v2 ? 1 : 0
    })

    return releaseBranches[releaseBranches.length - 1]
}

// Bamboo API Access

function bambooGet(path) {
    console.log('GET ' + config.bamboo.host + path)
    return new Promise(function(resolve, reject) {
        const options = {
            url: config.bamboo.host + path + (path.includes('?') ? '&' : '?') + 'os_authType=basic',
            headers: {
                'Authorization': config.authorization,
                'Accept': 'application/json',
                'X-Atlassian-Token': 'no-check'
            }
        }
        const callback = function(error, response, body) {
            if (error || response.statusCode != 200) {
                reject(error)
            } else {
                resolve(JSON.parse(body))
            }
        }
        request(options, callback)
    })
}

async function bambooGetAll(path, entityPlural, entitySingular) {
    let results = []
    let offset = 0
    let count = 25

    while (true) {
        let json

        try {
            json = await bambooGet(path + (path.includes('?') ? '&' : '?') + 'start-index=' + offset + '&max-results=' + count)
        } catch (error) {
            console.log('ERR Failed to get chunk ' + offset + '..' + (offset + count) + ': ' + error)
            break
        }

        results = results.concat(json[entityPlural][entitySingular])
        offset += count

        if (offset >= json[entityPlural]['size']) {
            break
        }
    }

    return results
}

async function bambooGetAllPlans() {
    return await bambooGetAll('/rest/api/latest/project/IOS?expand=plans', 'plans', 'plan')
}

async function bambooGetAllResults(planKey) {
    return await bambooGetAll('/rest/api/latest/result/' + planKey, 'results', 'result')
}

async function bambooGetResultDetails(key) {
    try {
        return await bambooGet('/rest/api/latest/result/' + key)
    } catch (error) {
        console.log('ERR Failed to get result details for ' + key + ': ' + error)
        return null
    }
}

async function bambooGetAllBranches(planKey) {
    return await bambooGetAll('/rest/api/latest/plan/' + planKey + '/branch', 'branches', 'branch')
}

// Bamboo Response Processing

async function bambooGetAllEnabledPlans() {
    let plans = await bambooGetAllPlans()
    return plans.filter(function(plan) {
        return plan['enabled']
    })
}

async function bambooGetBranch(branchName, planKey) {
    let allBranches = await bambooGetAllBranches(planKey)
    let normalizedName = branchName.replace('/', '-')

    for (let i = 0; i < allBranches.length; ++i) {
        if (allBranches[i]['shortName'] == normalizedName) {
            return allBranches[i]
        }
    }

    return null
}

async function bambooGetLatestFailedResults(branchName) {
    console.log('Getting all enabled plans...')

    let allPlans = await bambooGetAllEnabledPlans()
    let planKeys = []

    if (branchName == 'master') {
        allPlans.forEach(function(plan) {
            planKeys.push(plan['planKey']['key'])
        })
    } else {
        console.log('Filtering down to active plans for branch ' + branchName + '...')

        let promises = []
        allPlans.forEach(function(plan) {
            promises.push(bambooGetBranch(branchName, plan['planKey']['key']))
        })
        let allBranches = await Promise.all(promises)
        allBranches.forEach(function(branch) {
            if (branch) {
                planKeys.push(branch['key'])
            }
        })
    }

    console.log('Getting all results...')

    let promises = []
    planKeys.forEach(function(planKey) {
        promises.push(bambooGetAllResults(planKey))
    })

    let allResults = await Promise.all(promises)

    console.log('Determining failed results...')

    failingResultKeys = []

    for (let i = 0; i < allResults.length; ++i) {
        let results = allResults[i].filter(function(result) {
            return result['state'] == 'Successful' || result['state'] == 'Failed'
        })
        if (results.length && results[0]['state'] == 'Failed') {
            failingResultKeys.push(results[0]['key'])
        }
    }

    promises = []
    failingResultKeys.forEach(function(key) {
        promises.push(bambooGetResultDetails(key))
    })

    return (await Promise.all(promises)).filter(function(result) {
        return result != null
    })
}

// Main

const port = 8080

http.createServer(async function(request, response) {
    const template = loadTemplate('template.html')
    const context = await loadContext()
    const html = injectContext(template, context)

    response.writeHead(200, {'Content-Type': 'text/html'})
    response.write(html)
    response.end()
}).listen(port)

console.log('Listening on port ' + port)
