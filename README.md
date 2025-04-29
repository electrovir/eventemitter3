# @electrovir/eventemitter3

This is drop-in replacement for [eventemitter3](https://www.npmjs.com/package/eventemitter3) with fixed exports and modern syntax (because the original's repo is dead).

## install

```sh
npm i @electrovir/eventemitter3
```

## usage

Add the following to your `package.json` (in a mono-repo, make sure it's added to the root of the mono-repo):

```json
    "overrides": {
        "eventemitter3": "npm:@electrovir/eventemitter3"
    }
```
