import { mapKey, weatherKey, newsKey, nytKey } from './keys.js';

// grab user's lat lon, then reverse geolocate via mapquest for city name
if ('geolocation' in navigator) {
    console.log('geolocation avail');
    navigator.geolocation.getCurrentPosition(position => {
        const latlon = position.coords.latitude + ',' + position.coords.longitude;
        const mapUrl = 'http://open.mapquestapi.com/geocoding/v1/reverse?key=' + mapKey + '&location=' + latlon + '&includeRoadMetadata=true&includeNearestIntersection=true';
        let city = '';
        reverseGeolocate(mapUrl);
    })
} else {
    console.alert('Geolocation not available.');
}

// async func for mapquest api call
async function reverseGeolocate(url) {
    try {
        const rawResponse = await fetch(url);    
        if (!rawResponse.ok) {
          throw new Error(rawResponse.message);
        }
        if (rawResponse.status === 404) {
          throw new Error('Not found');
        }
        const jsonResponse = await rawResponse.json();
        // grabbing city
        let city = jsonResponse.results[0].locations[0].adminArea5;
        // updating ui
        document.getElementById('city').innerHTML = city;
        document.getElementById('city-wiki').href = 'https://en.wikipedia.org/wiki/' + city;
        // running getWeather api call and ui update
        getWeather(city);
        return jsonResponse, city;
    } catch (err) {
        console.log('err', err);
    }
}

// get weather - only works for cities in the us for now
async function getWeather(city) {
    // API URL w imported key
    const weatherUrl = "http://api.openweathermap.org/data/2.5/weather?q=" + city + ",us&appid=" + weatherKey;
    try {
        // fetch the raw response
        const rawResponse = await fetch(weatherUrl);
        // rawResponse.ok is true if status code is between 200 - 299
        if (!rawResponse.ok) {
          throw new Error(rawResponse);
        }
        const jsonResponse = await rawResponse.json();
        console.log('jsonResponse', jsonResponse);
        // grabbing temp
        let temp = JSON.parse(jsonResponse.main.temp);
        // converting kelvin to fahrenheit
        let tempF = ((temp - 273.15) * (9/5) + 32).toFixed(1);
        console.log(tempF);
        console.log(city);
        // updating UI
        document.getElementById('temp').innerHTML = tempF;
    } catch (err) {
        console.log('err', err);
    }  
}

// news sources api calls
let newsSources = [
    'https://newsapi.org/v2/top-headlines?country=us&apiKey=' + newsKey,
    'https://cors.bridged.cc/https://www.reddit.com/top.json',
    'https://api.nytimes.com/svc/topstories/v2/arts.json?api-key=' + nytKey
];
  
function renderRows(data) {
    let mainElem = document.getElementById('main');
    let articleElem = document.createElement('article');
    articleElem.className = 'article';
    articleElem.innerHTML = `
        <section class="featuredImage">
            <img src="${data.img}" alt="" />
        </section>
        <section class="articleContent">
            <h3>${data.title}</h3>
            <h6>Author: ${data.author}</h6>
            <h6>Source: ${data.source}</h6>
        </section>
        <section class="impressions">
            Published:<br>
            ${data.date}
        </section>
        <div class="clearfix"></div>
        `;
    // adding event listeners and updating popup
    articleElem.addEventListener('click', function() {
        const popUp = document.getElementById('popUp');
        popUp.classList.remove('hidden');
        popUp.innerHTML = `
        <a id="closePopUp">X</a>
        <div class="container">
            <h1>${data.title}</h1>
            <p>${data.content}</p>
            <p>Author: ${data.author}</p>
            <p>Source: ${data.source}</p>
            <a href="${data.url}" class="popUpAction" target="blank">Read more from source</a>
        </div>
        `; 
        return popUp;
    });
    // popup hidden on click
    popUp.addEventListener('click', function() {
        popUp.classList.add('hidden');
    })
    mainElem.appendChild(articleElem);
    // search bar script
    const submit = document.getElementById('submit-search');
    submit.addEventListener('click', function() {
        let textInput = document.getElementById('search-input').value;
        console.log(textInput);
        let children = mainElem.children;
        for (let index = 0; index < children.length; index++) {
            if (children[index].innerHTML.includes(textInput)) {
                console.log('matches found');
                children[index].style.display = 'block';
            } else if (!children[index].innerHTML.includes(textInput)) {
                children[index].style.display = 'none';
            }
        };
    });
    const reset = document.getElementById('reset-search');
    reset.addEventListener('click', function() {
        document.getElementById('search-input').value = '';
        let children = mainElem.children;
        for (let index = 0; index < children.length; index++) {
            children[index].style.display = 'block';
        }
    });
}
  
async function retrieveData(dataUrl) {
    try {
        const rawResponse = await fetch(dataUrl);
  
        if (!rawResponse.ok) {
            throw new Error(rawResponse.message);
        }
  
        if (rawResponse.status === 404) {
            throw new Error('Not found');
        }
  
        const jsonResponse = await rawResponse.json();
        console.log(jsonResponse);
        return jsonResponse;
    } catch (err) {
        console.log('err', err);
    }
}
  
function normalizeData(data) {
    console.log('data', data);
    function ArticleObj(title, author, url, img, source, date, content) {
        this.title = title;
        this.author = author;
        this.url = url;
        this.img = img;
        this.source = source;
        this.date = date;
        this.content = content;
    }
    for (let i = 0; i < data.length; i++) {
        let cleanData = [];
        if(i === 0) { 
            //news api
            data[i].articles.forEach(function(result) {
                cleanData.push(new ArticleObj(result.title, result.author, result.url, result.urlToImage, result.source.name, result.publishedAt, result.description));
            });
            data[i] = cleanData;
        } else if(i === 1) { 
            //reddit
            data[i].data.children.forEach(function(result) {
                cleanData.push(new ArticleObj(result.data.title, result.data.author, result.data.url, result.data.thumbnail, result.data.subreddit_name_prefixed, result.data.created, result.data.subreddit_name_prefixed));
            });
            data[i] = cleanData;
        } else if(i === 2) {
            // nyt
            data[i].results.forEach(function(result) {
                cleanData.push(new ArticleObj(result.title, result.byline, result.url, result.multimedia[0].url, result.section, result.created_date, result.abstract));
            });
            data[i] = cleanData;
        }
    }
    return data;
}
  
// loads data
async function init(sources) {
    // retrievesData from the various sources listed in array above
    let promises = [];
    for (let i = 0; i < sources.length; i++) {
        promises.push(retrieveData(sources[i]));
    }
    // awaits that all data has been loaded before using
    const newsData = await Promise.all(promises);
    // normalize, have data in a more predicatable fashion since all api data is different
    let cleanData = normalizeData(newsData);
  
    // for each set of data, we want to loop through and append to our page
    cleanData.forEach(function(sources) {
        // looping through each individual set of data per api
        sources.forEach(function(articles) {
            // appending the article rows to the DOM
            renderRows(articles);
        });
    });
}
  
init(newsSources);

// need function that filters data based on geolocation