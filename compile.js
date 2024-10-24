import {Lexer} from "./lexer.js";
import {Parser} from "./parser.js";
import { Environment } from "./environment.js";
import {CodeGen} from "./gen.js";
const file = Bun.file(process.argv[2] ? process.argv[2] : "./test.txt");
const source = await file.text();

let lex = new Lexer(source);
lex.tokenize();
console.log(lex.tokens);
let parse = new Parser(lex.tokens);

parse.parse();
console.log(JSON.stringify(parse.ast, null, 2));

let build = new Environment(parse.ast);
build.startTraversal(true);
build.debug();

let ast = build.populateAst(build.ast);
console.log(JSON.stringify(ast, null, 2));
let cg = new CodeGen(ast, ".out.ll");
cg.write();