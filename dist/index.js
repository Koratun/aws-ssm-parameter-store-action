"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const os_1 = require("os");
const path_1 = __importDefault(require("path"));
const client_ssm_1 = require("@aws-sdk/client-ssm");
const core = __importStar(require("@actions/core"));
const minimatch_1 = __importDefault(require("minimatch"));
const DEFAULT_DOTENV_FILENAME = '.env';
const FORMATTERS = new Map([
    ['dotenv', (parameters) => {
            const filename = core.getInput('filename') || DEFAULT_DOTENV_FILENAME;
            const content = parameters.map(param => `${path_1.default.basename(param.Name)}=${param.Value}`).join(os_1.EOL);
            fs_1.default.writeFileSync(filename, content);
        }],
    ['as-is', (parameters) => {
            const { Name, Value } = parameters[0];
            const filename = core.getInput('filename') || path_1.default.basename(Name);
            fs_1.default.writeFileSync(filename, Value);
        }],
]);
async function main() {
    const credentials = {
        accessKeyId: core.getInput('aws-access-key-id'),
        secretAccessKey: core.getInput('aws-secret-access-key'),
    };
    const region = core.getInput('aws-region');
    const Path = core.getInput('path');
    const pattern = core.getInput('pattern');
    const client = new client_ssm_1.SSMClient({ region, credentials });
    const input = {
        Path,
        WithDecryption: core.getBooleanInput('with-decryption'),
        Recursive: core.getBooleanInput('recursive'),
    };
    const parameters = [];
    const mandate = ((parameters) => parameters.filter(p => p.Name && p.Value));
    const matcher = (parameter) => pattern ? minimatch_1.default(path_1.default.basename(parameter.Name), pattern) : true;
    while (true) {
        const command = new client_ssm_1.GetParametersByPathCommand(input);
        const result = await client.send(command);
        parameters.push(...(mandate(result.Parameters || []).filter(matcher)));
        if (result.NextToken) {
            Object.assign(input, { NextToken: result.NextToken });
        }
        else {
            break;
        }
    }
    if (core.isDebug()) {
        core.debug(JSON.stringify(parameters));
    }
    parameters.forEach(parameter => {
        core.setOutput(path_1.default.basename(parameter.Name), parameter.Value);
    });
    FORMATTERS.get(core.getInput('format'))?.call(null, parameters);
}
main().catch(e => core.setFailed(e.message));
exports.default = main;
