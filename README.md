# emote-server
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

## Installation & Deployment

1. Create an Heroku application:

``` bash
heroku create <app-name>
```

2. Add Heroku Redis Support:

``` bash
heroku addons:create heroku-redis:hobby-dev
```

3. Deploy to Heroku

```
git push heroku main
```

## Local Development

Install dependencies:

``` bash
npm install
```

Run Server in development mode:

```
npm run start:dev
```

## Configuration

* `REDIS_URL` - A Redis connection string
* `RATE_LIMIT_MAX` - Max number of requests per Window (Default: 100)
* `RATE_LIMIT_WINDOW` - Duration of the Rate Limit Window (Default: 1 minute)
* `HEARTBEAT_TIMEOUT` - Duration of the Heartbeat (Default: 30 seconds)
* `EVENT_ID_LENGTH` - Max length of an Event ID (Default: 32 characters)
* `EVENTS_MAX` - Max numbers of Event Streams (Default: 32)

### Styling Configuration

Colors, fonts, and positioning can be configured in `widget.scss`

#### Positioning 

1. Set `widget-side` to `right` or `left` in `widget.scss`
2. Add absolute positioning to your site's CSS to adjust were it appears.

```
emote-widget {
    position: absolute;
    right: 0;
    bottom: 0;
}
```

## API

### `GET /api/emote/:id`

Returns the votes by Event

#### Url Parameters

- `id` - Represents an Event by ID

#### Output

``` json
{
  "smile": 100,
  "love": 103,
  "plus_one": 5,
  "question": 1
}
```

### `POST /api/emote/:id`

Submit a vote by Event

#### Url Parameters

- `id` - Represents an Event by ID

#### Body

``` json
{
  "emote": "smile"
}
```

#### Output (200 - Success)

**Body**

``` json
{
  "message": "emote received"
}
```

#### Output (429 - Rate Limit)

**Headers**

```
retry-after: 60000
x-ratelimit-limit: 100
x-ratelimit-remaining: 0
x-ratelimit-reset: 39
```

**Body**

``` json
{
    "error": "Too Many Requests",
    "message": "Rate limit exceeded, retry in 1 minute",
    "statusCode": 429
}
```

### `GET /events/emote/:id`

Connect to an event stream by Event ID

#### Events

* `emote` - An `emote` has been received - (data: `smile`)
* `votes` - A `votes` state object has been received (data: `{"smile": 1, "question": 3}`)
* `heartbeat` - A `ping` has been received (data: `ping`)

## 🤝 Contributing

We love contributions, small or big, from others!

Please see our [CONTRIBUTING](https://github.com/fostive/.github/blob/main/CONTRIBUTING.md) guidelines. The first thing to do is to discuss the change you wish to make via issue, email, or any other method with the owners of this repository.

Also, please review our [code of conduct](https://github.com/fostive/.github/blob/main/CODE_OF_CONDUCT.md). Please adhere to it in all your interactions with this project.

Thanks goes to these wonderful ✨ people ([emoji key](https://allcontributors.org/docs/en/emoji-key)) for contributing to the project:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://clif.world"><img src="https://avatars2.githubusercontent.com/u/13678764?v=4" width="100px;" alt=""/><br /><sub><b>Clifton Campbell</b></sub></a><br /><a href="https://github.com/fostive/emote-server/commits?author=clif-os" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Code of Conduct

Please review and adhere to our [CODE_OF_CONDUCT.md](https://github.com/fostive/.github/blob/main/CODE_OF_CONDUCT.md) before contributing to this project in any way (e.g. creating an issue, writing code, etc).

## 📝 License

This project is licensed under the Creative Commons Zero v1.0 License. See the [LICENSE](LICENSE) file for details.
