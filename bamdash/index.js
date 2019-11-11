const fs = require('fs')
const http = require('http')
const handlebars = require('handlebars')
const jsdom = require('jsdom'); const { JSDOM } = jsdom
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
        // let agents = await bambooGetAlliOSAgents()

        // let masterResults = await bambooGetLatestFailedResults('IOS', 'master')
        let releaseBranch = (await bitbucketGetLatestReleaseBranch())['displayId']
        // let releaseBranchResults = await bambooGetLatestFailedResults('IOS', releaseBranch)
        // let screenshotResults = await bambooGetLatestFailedResults('IOSS', 'master')

        resolve({
            // agents: getAgentsContexts(agents),
            // groups: [
            //         getGroupContext('master', masterResults, 'plan'),
            //         getGroupContext(releaseBranch, releaseBranchResults, 'master'),
            //         getGroupContext('Screenshots', screenshotResults, 'plan')
            //     ],
            releaseStatus: [
                await getReleaseStatusContext('Cheapflights', 'IRA-MTC', 'IOS-MCD', 'IRA-LUBCF', releaseBranch),
                await getReleaseStatusContext('Checkfelix', 'IRA-MTCF', 'IOS-MCD0', 'IRA-LUBC', releaseBranch),
                await getReleaseStatusContext('HotelsCombined', 'IRA-MTH', 'IOS-HT', 'IRA-LUBH', releaseBranch),
                await getReleaseStatusContext('KAYAK', 'IRA-MTK', 'IOS-MKD', 'IRA-LUBK', releaseBranch),
                await getReleaseStatusContext('Momondo', 'IRA-MTM', 'IOS-MTF', 'IRA-LUBM', releaseBranch),
                await getReleaseStatusContext('Mundi', 'IRA-MTMU', 'IOS-MMD0', 'IRA-LUBMU', releaseBranch),
                await getReleaseStatusContext('Swoodoo', 'IRA-MTS', 'IOS-MSD', 'IRA-LUBS', releaseBranch)
            ],
            date: getCurrentTime()
        })
    })
}

function getAgentsContexts(agents) {
    return {
        numTotal: agents.length,
        numBusy: agents.filter(function(agent) {
                return agent['busy']
            }).length,
        inactiveOrDisabled: agents.filter(function(agent) {
                return !agent['active'] || !agent['enabled']
            }).map(function(agent) {
                return {
                    name: agent['name'],
                    isActive: agent['active'],
                    isEnabled: agent['enabled'],
                    link: config.bamboo.host + '/admin/agent/viewAgent.action?agentId=' + agent['id']
                }
            })
    }
}

function getGroupContext(name, results, planNameKey) {
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

async function getReleaseStatusContext(brand, metadataTranslationsPlanKey, testFlightPlanKey, latestBuildPlanKey, releaseBranch) {
    let translationsResult = await bambooGetLatestResult('master', metadataTranslationsPlanKey)
    let testFlightResult = await bambooGetLatestResult(releaseBranch, testFlightPlanKey)
    let latestBuildResult = await bambooGetLatestResult(releaseBranch, latestBuildPlanKey)
    let latestBuildArtifactsByName = await bambooGetPlainTextArtifacts(latestBuildResult, ['Short Version', 'Bundle Version'])

    let commit = null
    if (testFlightResult) {
        let json = await bitbucketGetCommit(testFlightResult.vcsRevisionKey)
        let subject = json.message.split('\n')[0]
        if (subject.length > 20) {
           subject = subject.slice(0, 20).trim() + '...'
        }
        commit = {
            sha: testFlightResult.vcsRevisionKey.slice(0, 6),
            commitTime: getCommitTimeString(json.committerTimestamp),
            committer: json.committer.displayName,
            subject: subject,
            link: `https://git.runwaynine.com/projects/MOB/repos/ios/commits/${testFlightResult.vcsRevisionKey}`
        }
    }

    let translations = translationsResult === null ? null : {
        buildTime: getBuildTimeString(translationsResult['buildCompletedTime']),
        resultLink: config.bamboo.host + '/browse/' + translationsResult['buildResultKey'],
        planLink: config.bamboo.host + '/browse/' + translationsResult['plan']['key'],
        successful: translationsResult['state'] == 'Successful'
    }

    let testFlight = testFlightResult === null ? null : {
        commit: commit,
        bundleVersion: getBundleVersionFromTestFlightArtifacts(testFlightResult.artifacts.artifact),
        buildTime: getBuildTimeString(testFlightResult['buildCompletedTime']),
        resultLink: config.bamboo.host + '/browse/' + testFlightResult['buildResultKey'],
        planLink: config.bamboo.host + '/browse/' + testFlightResult['plan']['key'],
        successful: testFlightResult['state'] == 'Successful',
    }

    let latestBuild = {
        shortVersion: latestBuildArtifactsByName ? latestBuildArtifactsByName['Short Version'] : null,
        bundleVersion: latestBuildArtifactsByName ? latestBuildArtifactsByName['Bundle Version'] : null,
        buildTime: getBuildTimeString(latestBuildResult['buildCompletedTime']),
        resultLink: config.bamboo.host + '/browse/' + latestBuildResult['buildResultKey'],
        planLink: config.bamboo.host + '/browse/' + latestBuildResult['plan']['key'],
        successful: latestBuildResult['state'] == 'Successful'
    }

    let processing = latestBuild.bundleVersion && testFlight && testFlight.successful ? latestBuild.bundleVersion !== testFlight.bundleVersion : false
    let readyToSubmit = translations && translations.successful && testFlight && testFlight.successful && !processing

    return {
        brand: brand,
        processing: processing,
        readyToSubmit: readyToSubmit,
        releaseBranch: releaseBranch,
        translations: translations,
        testFlight: testFlight,
        latestBuild: latestBuild
    }
}

function getBundleVersionFromTestFlightArtifacts(artifacts) {
    if (!artifacts || artifacts.length === 0) {
        return null
    }
    let regex = /.*-(\d+)\.ipa/
    let match = regex.exec(artifacts[0].link.href)
    return match !== null ? match[1] : null
}

function getBuildTimeString(buildCompletedTime) {
    return getTimeAgoString(new Date(Date.parse(buildCompletedTime)))
}

function getCommitTimeString(timestamp) {
    return getTimeAgoString(new Date(timestamp))
}

function getTimeAgoString(date) {
    const minutesSinceBuild = (new Date() - date) / 1000 / 60
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

async function bitbucketGetCommit(sha) {
    console.log(`Getting commit ${sha}...`)
    return await bitbucketGet(`/rest/api/1.0/projects/MOB/repos/ios/commits/${sha}`)
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

function bambooGetPlainText(url) {
    console.log('GET ' + url)
    return new Promise(function(resolve, reject) {
        const options = {
            url: url + (url.includes('?') ? '&' : '?') + 'os_authType=basic',
            headers: {
                'Authorization': config.authorization,
                'Accept': 'text/plain',
                'X-Atlassian-Token': 'no-check'
            }
        }
        const callback = function(error, response, body) {
            if (error || response.statusCode != 200) {
                reject(error)
            } else {
                resolve(JSDOM.fragment(body).textContent.trim())
            }
        }
        request(options, callback)
    })
}

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

async function bambooGetAllPlans(projectKey) {
    return await bambooGetAll('/rest/api/latest/project/' + projectKey + '?expand=plans', 'plans', 'plan')
}

async function bambooGetAllResults(planKey) {
    return await bambooGetAll('/rest/api/latest/result/' + planKey, 'results', 'result')
}

async function bambooGetResultDetails(key) {
    try {
        return await bambooGet('/rest/api/latest/result/' + key + '?expand=artifacts')
    } catch (error) {
        console.log('ERR Failed to get result details for ' + key + ': ' + error)
        return null
    }
}

async function bambooGetAllBranches(planKey) {
    return await bambooGetAll('/rest/api/latest/plan/' + planKey + '/branch', 'branches', 'branch')
}

async function bambooGetAgents() {
    try {
        return await bambooGet('/rest/api/latest/agent')
    } catch (error) {
        console.log('ERR Failed to get agents: ' + error)
        return []
    }
}

// Bamboo Response Processing

async function bambooGetAllEnabledPlans(projectKey) {
    let plans = await bambooGetAllPlans(projectKey)
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

async function bambooGetLatestFailedResults(projectKey, branchName) {
    console.log('Getting all enabled plans...')

    let allPlans = await bambooGetAllEnabledPlans(projectKey)
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

async function bambooGetLatestResult(branchName, planKey) {
    console.log(`Getting latest result for ${planKey} on ${branchName} artifacts...`)
    if (branchName == 'master') {
        return await bambooGetResultDetails(planKey + '-latest')
    }
    let branch = await bambooGetBranch(branchName, planKey)
    return await bambooGetResultDetails(branch['key'] + '-latest')
}

async function bambooGetPlainTextArtifacts(result, artifactNames) {
    console.log('Getting plain text artifacts...')

    if (result['state'] !== 'Successful') {
        return null
    }

    let artifacts = result.artifacts.artifact.filter(function(artifact) {
        return artifactNames.includes(artifact.name)
    })

    promises = []
    artifacts.forEach(function(artifact) {
        promises.push(bambooGetPlainText(artifact.link.href))
    })
    let results = await Promise.all(promises)

    let resultsByArtifactName = {}
    for (let i = 0; i < artifacts.length; ++i) {
        resultsByArtifactName[artifacts[i].name] = results[i]
    }

    return resultsByArtifactName
}

async function bambooGetAlliOSAgents() {
    let allAgents = await bambooGetAgents()
    let iosAgents = allAgents.filter(function(agent) {
        return agent['name'].includes('ios')
    })

    iosAgents.sort(function compare(one, other) {
        return one['name'] < other['name'] ? -1 : one['name'] > other['name'] ? 1 : 0
    })

    return iosAgents
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
