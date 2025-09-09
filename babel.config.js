module.exports = {
    "presets": [
        "@babel/preset-flow",
        "@babel/preset-env",
        "@babel/preset-react",
        [
            "@babel/preset-typescript",
            {
                isTSX: true,
                allExtensions: true
            }
        ]
    ]
}