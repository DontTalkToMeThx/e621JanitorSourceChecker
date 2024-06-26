// ==UserScript==
// @name         e621 Janitor Source Checker
// @version      0.16
// @description  Tells you if a pending post matches its source.
// @author       Tarrgon
// @match        https://e621.net/posts/*
// @updateURL    https://github.com/DontTalkToMeThx/e621JanitorSourceChecker/releases/latest/download/e621JanitorSourceChecker.user.js
// @downloadURL  https://github.com/DontTalkToMeThx/e621JanitorSourceChecker/releases/latest/download/e621JanitorSourceChecker.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=e621.net
// @connect      search.yiff.today
// @grant        GM.xmlHttpRequest
// @run-at       document-end
// ==/UserScript==

const md5Match = (() => {
  let i = document.createElement("i")
  i.classList.add("fa-solid", "fa-check-double", "jsv-icon")
  i.style.color = "lime"
  i.title = "MD5 match"
  return i
})();

const dimensionAndFileTypeMatch = (() => {
  let i = document.createElement("i")
  i.classList.add("fa-solid", "fa-check", "jsv-icon")
  i.style.color = "lime"
  i.title = "Dimension and file type match"
  return i
})();

const dimensionMatch = (() => {
  let i = document.createElement("i")
  i.classList.add("fa-solid", "fa-check", "jsv-icon")
  i.style.color = "yellow"
  i.title = "Dimension match"
  return i
})();

const aspectRatioMatch = (() => {
  let i = document.createElement("i")
  i.classList.add("fa-solid", "fa-square", "jsv-icon")
  i.title = "Approx. aspect ratio match"
  return i
})();

const fileTypeMatch = (() => {
  let i = document.createElement("i")
  i.classList.add("fa-solid", "fa-xmark", "jsv-icon")
  i.style.color = "yellow"
  i.title = "File type match"
  return i
})();

const noMatches = (() => {
  let i = document.createElement("i")
  i.classList.add("fa-solid", "fa-xmark", "jsv-icon")
  i.style.color = "red"
  i.title = "No matches"
  return i
})();

const spinner = (() => {
  let i = document.createElement("i")
  i.classList.add("fa-solid", "fa-spinner", "fa-spin", "jsv-icon")
  i.style.color = "yellow"
  i.title = "Queued"
  return i
})();

const unknown = (() => {
  let i = document.createElement("i")
  i.classList.add("fa", "fa-question", "jsv-icon")
  i.style.color = "yellow"
  i.title = "Unknown"
  return i
})();

const bvas = (() => {
  let i = document.createElement("i")
  i.classList.add("fa", "fa-plus", "jsv-icon")
  i.style.color = "lime"
  i.style.marginRight = "0.25rem"
  i.style.marginLeft = "0.25rem"
  return i
})();

const info = (() => {
  let i = document.createElement("i")
  i.classList.add("fa", "fa-circle-info", "jsv-icon")
  i.style.color = "cyan"
  i.style.marginRight = "0.25rem"
  return i
})();

const force = (() => {
  let i = document.createElement("i")
  i.classList.add("fa", "fa-angles-down", "jsv-icon")
  i.style.color = "green"
  i.style.cursor = "pointer"
  i.title = "Get source data"
  return i
})();

const reload = (() => {
  let i = document.createElement("i")
  i.classList.add("fa", "fa-rotate")
  i.style.color = "green"
  i.style.cursor = "pointer"
  i.title = "Update source data"
  return i
})();

async function getData(id, force = false) {
  if (!force) {
    return new Promise((resolve, reject) => {
      let req = {
        method: "GET",
        url: `https://search.yiff.today/checksource/${id}`,
        onload: function (response) {
          try {
            let data = JSON.parse(response.responseText)

            resolve(data)
          } catch (e) {
            reject(e)
          }
        },
        onerror: function (e) {
          reject(e)
        }
      }

      GM.xmlHttpRequest(req)
    })
  } else {
    return new Promise((resolve, reject) => {
      let req = {
        method: "GET",
        url: `https://search.yiff.today/checksource/${id}?checkapproved=true&waitfordata=true`,
        onload: function (response) {
          try {
            let data = JSON.parse(response.responseText)

            resolve(data)
          } catch (e) {
            reject(e)
          }
        },
        onerror: function (e) {
          reject(e)
        }
      }

      GM.xmlHttpRequest(req)
    })
  }
}

async function update(id) {
  return new Promise((resolve, reject) => {
    let req = {
      method: "GET",
      url: `https://search.yiff.today/checksource/update/${id}?waitfordata=true`,
      onload: function (response) {
        try {
          let data = JSON.parse(response.responseText)

          resolve(data)
        } catch (e) {
          reject(e)
        }
      },
      onerror: function (e) {
        reject(e)
      }
    }

    GM.xmlHttpRequest(req)
  })
}

function approximateAspectRatio(val, lim) {
  let lower = [0, 1]
  let upper = [1, 0]

  while (true) {
    let mediant = [lower[0] + upper[0], lower[1] + upper[1]]

    if (val * mediant[1] > mediant[0]) {
      if (lim < mediant[1]) {
        return upper
      }
      lower = mediant
    } else if (val * mediant[1] == mediant[0]) {
      if (lim >= mediant[1]) {
        return mediant
      }
      if (lower[1] < upper[1]) {
        return lower
      }
      return upper;
    } else {
      if (lim < mediant[1]) {
        return lower
      }
      upper = mediant
    }
  }
}

function roundTo(x, n) {
  let power = 10 ** n
  return Math.floor(x * power) / power
}

function processData(data) {
  console.log(data)
  let allLi = Array.from(document.getElementById("post-information").querySelectorAll("li"))
  let id = allLi.find(e => e.innerText.startsWith("ID:")).innerText.slice(4)
  if (data.notPending) {
    let links = document.querySelector(".source-links")
    let forceClone = force.cloneNode()
    forceClone.addEventListener("click", async () => {
      forceClone.remove()
      let links = document.querySelector(".source-links")
      let spinny = spinner.cloneNode()
      links.insertBefore(spinny, links.firstElementChild)
      let data = await getData(id, true)
      spinny.remove()
      processData(data)
    })
    links.insertBefore(forceClone, links.firstElementChild)
    return
  }

  if (data.queued) {
    let links = document.querySelector(".source-links")
    links.insertBefore(spinner.cloneNode(), links.firstElementChild)
    return
  } else if (data.unsupported) {
    let links = document.querySelector(".source-links")
    let noMatchesClone = noMatches.cloneNode()
    noMatchesClone.title = "Unsupported"
    links.insertBefore(noMatchesClone, links.firstElementChild)
    return
  }

  let links = document.querySelector(".source-links")
  let reloadClone = reload.cloneNode()
  reloadClone.addEventListener("click", async () => {
    for (let ele of document.querySelectorAll(".jsv-icon")) {
      ele.remove()
    }
    reloadClone.remove()
    let links = document.querySelector(".source-links")
    let spinny = spinner.cloneNode()
    links.insertBefore(spinny, links.firstElementChild)
    let data = await update(id)
    spinny.remove()
    processData(data)
  })
  links.insertBefore(reloadClone, links.firstElementChild)

  let allSourceLinks = Array.from(document.getElementById("post-information").querySelectorAll(".source-link"))

  let width = parseInt(document.querySelector("span[itemprop='width']").innerText)
  let height = parseInt(document.querySelector("span[itemprop='height']").innerText)
  let fileType = allLi.find(e => e.innerText.trim().startsWith("Type:")).innerText.trim().slice(6).toLowerCase()

  let approxAspectRatio = approximateAspectRatio(width / height, 50)

  for (let [source, sourceData] of Object.entries(data)) {
    let matchingSourceEntry = allSourceLinks.find(e => decodeURI(e.children[0].href) == source || e.children[0].href == source)
    console.log(matchingSourceEntry)

    if (matchingSourceEntry) {

      let embeddedInfo = info.cloneNode(true)

      let matchingAspectRatio = false

      if (sourceData.dimensions) {
        let sourceApproxAspectRatio = approximateAspectRatio(width / height, 50)
        matchingAspectRatio = approxAspectRatio[0] == sourceApproxAspectRatio[0] && approxAspectRatio[1] == sourceApproxAspectRatio[1]

        embeddedInfo.title = `${sourceData.dimensions.width}x${sourceData.dimensions.height} (${roundTo(sourceData.dimensions.width / width, 2)}:${roundTo(sourceData.dimensions.height / height, 2)}) ${sourceData.fileType.toUpperCase()}`
        matchingSourceEntry.prepend(embeddedInfo)
      } else {
        embeddedInfo.title = `UNK`
        matchingSourceEntry.prepend(embeddedInfo)
      }

      if (sourceData.md5Match) {
        embeddedInfo.after(md5Match.cloneNode(true))
      } else if (sourceData.dimensionMatch && sourceData.fileTypeMatch) {
        embeddedInfo.after(dimensionAndFileTypeMatch.cloneNode(true))
      } else if (sourceData.dimensionMatch) {
        embeddedInfo.after(dimensionMatch.cloneNode(true))
      } else if (matchingAspectRatio) {
        if (sourceData.fileTypeMatch) {
          let clone = aspectRatioMatch.cloneNode(true)
          clone.title += " file type match"
          clone.style.color = "lime"
          embeddedInfo.after(clone)
        } else {
          let clone = aspectRatioMatch.cloneNode(true)
          clone.title += " different file type"
          clone.style.color = "yellow"
          embeddedInfo.after(clone)
        }
      } else if (sourceData.fileTypeMatch) {
        embeddedInfo.after(fileTypeMatch.cloneNode(true))
      } else if (sourceData.unknown) {
        embeddedInfo.after(unknown.cloneNode(true))
      } else {
        embeddedInfo.after(noMatches.cloneNode(true))
      }

      if (sourceData.isPreview) {
        let clone = bvas.cloneNode(true)
        clone.title = `Matched version is preview image. Original version available.`
        clone.style.color = "red"
        matchingSourceEntry.insertBefore(clone, matchingSourceEntry.children[2])
      }

      if (sourceData.dimensions && sourceData.fileType) {
        if (sourceData.dimensions.width > width && sourceData.dimensions.height > height) {
          if (fileType == "jpg" && sourceData.fileType == "png") {
            let clone = bvas.cloneNode(true)
            clone.title = `Bigger dimensions, PNG ${sourceData.dimensions.width}x${sourceData.dimensions.height}`
            matchingSourceEntry.insertBefore(clone, matchingSourceEntry.children[2])
          } else if (fileType == "png" && sourceData.fileType == "jpg") {
            if (sourceData.dimensions.width >= width * 3 && sourceData.dimensions.height >= height * 3) {
              let clone = bvas.cloneNode(true)
              clone.title = `3x size, JPG ${sourceData.dimensions.width}x${sourceData.dimensions.height}`
              matchingSourceEntry.insertBefore(clone, matchingSourceEntry.children[2])
            } else if (sourceData.dimensions.width >= width * 2 && sourceData.dimensions.height >= height * 2) {
              let clone = bvas.cloneNode(true)
              clone.style.color = "yellow"
              clone.title = `2x size, JPG ${sourceData.dimensions.width}x${sourceData.dimensions.height}`
              matchingSourceEntry.insertBefore(clone, matchingSourceEntry.children[2])
            }
          } else if (fileType == sourceData.fileType) {
            let clone = bvas.cloneNode(true)
            clone.title = `Bigger (${sourceData.fileType.toUpperCase()}) ${sourceData.dimensions.width}x${sourceData.dimensions.height}`
            matchingSourceEntry.insertBefore(clone, matchingSourceEntry.children[2])
          }
        } else if (fileType == "jpg" && sourceData.fileType == "png") {
          if (width <= sourceData.dimensions.width * 1.5 && height <= sourceData.dimensions.height * 1.5) {
            let clone = bvas.cloneNode(true)
            clone.title = `PNG Version ${sourceData.dimensions.width}x${sourceData.dimensions.height}`
            matchingSourceEntry.insertBefore(clone, matchingSourceEntry.children[2])
          }
        } else if (fileType == sourceData.fileType) {
          if (sourceData.dimensions.width > width || sourceData.dimensions.height > height) {
            let clone = bvas.cloneNode(true)
            clone.title = `Bigger (${sourceData.fileType.toUpperCase()}) ${sourceData.dimensions.width}x${sourceData.dimensions.height}`
            matchingSourceEntry.insertBefore(clone, matchingSourceEntry.children[2])
          }
        }
      }
    }
  }
}

(async function () {
  'use strict';
  let allLi = Array.from(document.getElementById("post-information").querySelectorAll("li"))
  let id = allLi.find(e => e.innerText.startsWith("ID:")).innerText.slice(4)
  console.log("LOADED")
  try {
    console.log("GETTING DATA", id)
    let data = await getData(id)
    console.log("PROCESSING")

    processData(data)

  } catch (e) {
    console.error(e)
  }
})();