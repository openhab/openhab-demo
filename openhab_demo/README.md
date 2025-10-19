# openHAB Demo Instance

This directory contains the configuration for the public openHAB instance.

## Configuration

Configuration is mainly done through file-based configuration: [`conf`](conf) directory.

### Things

Things are entirely configured through the YAML configuration format: [`conf/yaml`](conf/yaml) directory.

### Items

The base structure of the semantic model as well as lights, shades and other equipment installed in multiple rooms are
created programmatically through JS Scripting, leveraging openHAB's support for configuration as code.
This allows to easily provide a bunch of similar Items without the need to specify them over and over again.

Item that are more unique and not _repeated_ across multiple places are configured through YAML configuration,
which allows to keep Things and Items of the same binding in a single file.

See:

- [`conf/automation/js/01-items.js`](conf/automation/js/01-items.js)
- [`conf/items`](conf/items)
- [`conf/yaml`](conf/yaml)
- `.js` files may specify provide Items they need

### Rules

All rules that are infrastructure of the demo server, i.e. provide fake data or simulate physical devices,
are written in JavaScript: [`conf/automation/js`](conf/automation/js) directory.

### Add-ons, Runtime, Persistence etc.

As you would expect for file-based openHAB configuration.

## FAQ

### Where does the data come from?

**Solar production** data is based on the solar forecast from ForecastSolar along with some randomness.

**Load consumption** is based on a reasonable baseload value along with some randomness and load peaks during daytime.

**Battery power, SoC and grid power** are calculated by the battery simulation rule, see [`conf/automation/js/04-ems.js`](conf/automation/js/04-ems.js)

**Temperature measurements** are based on a seasonal base value along with some randomness, they are higher on average during summer and lower on average during winter.
**Contact, door & door lock states** are random.
See [`conf/automation/js/02-states.js`](conf/automation/js/02-states.js).

**Playback control and information such as artist & song** are based on a predefined track list, see [`conf/automation/js/02-media-states.js`](conf/automation/js/02-media-states.js).

**Positions** are random, but limited to a rectangular area around Berlin, see [`conf/automation/js/02-position-states.js`](conf/automation/js/02-position-states.js).


### How can I get IntelliSense for the JavaScript code?

Run `npm install` in the [`conf/automation/js`](conf/automation/js) folder to install the dependencies, this will make type definitions available and thus enable IntelliSense in your IDE.

### How can I modify the configuration?

Please open an issue first discussing your suggested change.
There an approach will be discussed on how to test and deploy your changes.
