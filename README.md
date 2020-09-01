# emote-server

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

## 📝 License

This project is licensed under the Creative Commons Zero v1.0 License. See the [LICENSE](LICENSE) file for details.
