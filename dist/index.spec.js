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
const core = __importStar(require("@actions/core"));
const client_ssm_1 = require("@aws-sdk/client-ssm");
const fs_1 = __importDefault(require("fs"));
const os_1 = require("os");
const index_1 = __importDefault(require("./index"));
jest.mock('@actions/core');
jest.mock('@aws-sdk/client-ssm');
jest.mock('fs');
const MockedClient = client_ssm_1.SSMClient;
const getInput = core.getInput;
const DEFAULT_INPUTS = new Map([
    ['aws-access-key-id', 'aws-access-key-id'],
    ['aws-secret-access-key', 'aws-secret-access-key'],
    ['aws-region', 'aws-region'],
    ['path', '/config/path/'],
]);
describe("aws-parameter-store-action", () => {
    it("writes out as dotenv format to the given file", async () => {
        const inputs = new Map([...DEFAULT_INPUTS,
            ['format', 'dotenv'],
            ['filename', 'filename.txt'],
        ]);
        getInput.mockImplementation((key) => inputs.get(key));
        const Parameters = [{ Name: '/config/path/xxx', Value: 'xxx' }, { Name: '/config/path/yyy', Value: 'yyy' }];
        const send = jest.fn(async () => Object.assign({ Parameters }));
        MockedClient.mockImplementation(() => ({ send }));
        await index_1.default();
        expect(fs_1.default.writeFileSync).toHaveBeenCalledWith(inputs.get('filename'), `xxx=xxx${os_1.EOL}yyy=yyy`);
        expect(core.setOutput).toHaveBeenCalledWith('xxx', 'xxx');
        expect(core.setOutput).toHaveBeenCalledWith('yyy', 'yyy');
    });
    it("writes out as dotenv format matches pattern to file named .env if no filename given", async () => {
        const inputs = new Map([...DEFAULT_INPUTS,
            ['format', 'dotenv'],
            ['pattern', 'xxx'],
        ]);
        getInput.mockImplementation((key) => inputs.get(key));
        const Parameters = [{ Name: '/config/path/xxx', Value: 'xxx' }, { Name: '/config/path/yyy', Value: 'yyy' }];
        const send = jest.fn(async () => Object.assign({ Parameters }));
        MockedClient.mockImplementation(() => ({ send }));
        await index_1.default();
        expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('.env', `xxx=xxx`);
    });
    it("writes out as-is to the given file", async () => {
        const inputs = new Map([...DEFAULT_INPUTS,
            ['format', 'as-is'],
            ['filename', 'xxx.txt'],
        ]);
        getInput.mockImplementation((key) => inputs.get(key));
        const Parameters = [{ Name: '/config/path/xxx', Value: 'yyy' }];
        const send = jest.fn(async () => Object.assign({ Parameters }));
        MockedClient.mockImplementation(() => ({ send }));
        await index_1.default();
        expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('xxx.txt', 'yyy');
        expect(core.setOutput).toHaveBeenCalledWith('xxx', 'yyy');
    });
    it("writes out as-is to the first element's name of the list retrieved", async () => {
        const inputs = new Map([...DEFAULT_INPUTS,
            ['format', 'as-is'],
        ]);
        getInput.mockImplementation((key) => inputs.get(key));
        const Parameters = [{ Name: '/config/path/xxx', Value: 'yyy' }];
        const send = jest.fn(async () => Object.assign({ Parameters }));
        MockedClient.mockImplementation(() => ({ send }));
        await index_1.default();
        expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('xxx', 'yyy');
        expect(core.setOutput).toHaveBeenCalledWith('xxx', 'yyy');
    });
    it("retrieves parameters without format", async () => {
        const inputs = new Map([...DEFAULT_INPUTS,
            ['format', undefined],
        ]);
        getInput.mockImplementation((key) => inputs.get(key));
        const send = jest.fn(async () => Object.assign({}));
        MockedClient.mockImplementation(() => ({ send }));
        await index_1.default();
        expect(core.setOutput).not.toHaveBeenCalled();
    });
    it("prints out debug log if enabled debugging", async () => {
        core.isDebug.mockReturnValue(true);
        const Parameters = [{ Name: 'xxx', Value: 'yyy' }];
        const send = jest.fn(async () => Object.assign({ Parameters }));
        MockedClient.mockImplementation(() => ({ send }));
        await index_1.default();
        expect(core.debug).toHaveBeenCalledWith(JSON.stringify(Parameters));
    });
    it("executes additional commands if NextToken present", async () => {
        const inputs = new Map([...DEFAULT_INPUTS,
            ['format', 'dotenv'],
        ]);
        getInput.mockImplementation((key) => inputs.get(key));
        let calls = 0;
        const send = jest.fn(async () => {
            if (calls == 0) {
                calls++;
                return ({ Parameters: [{ Name: 'x1', Value: 'y1' }], NextToken: 'x' });
            }
            else {
                return ({ Parameters: [{ Name: 'x2', Value: 'y2' }] });
            }
        });
        MockedClient.mockImplementationOnce(() => ({ send }));
        await index_1.default();
        expect(send).toHaveBeenCalledTimes(2);
        expect(fs_1.default.writeFileSync).toHaveBeenCalledWith('.env', 'x1=y1\nx2=y2');
    });
});
