import {TOKENS} from "./define.js";
export class TypedAST {
    constructor(type, valType = "void", name = "") {
        this.type = type;
        this.name = name;
        this.typecode = Object.keys(TOKENS)[this.type];
        this.valType = valType;
    }
}
export class LiteralTypedAST extends TypedAST{
    constructor(type, valType, value = "") {
        super(type, valType);
        this.type = type;
        this.valType = valType;
        this.value = value;
    }
}
let TYPES = {
    UNKNOWN: "i32",
    I32: "i32",
    STRING: "string",
    BOOL: "bool",
    VOID: "void",
}
export class Environment {
    constructor(ast, parent = null) {
        this.ast = ast;
        this.parent = parent;
        this.type = TYPES.UNKNOWN;
        this.vars = {};
        this.children = [];
        this.depth = parent == null ? 0 : parent.depth + 1;
        this.funcWithParams = {};
        this.typedAST;
        this.childrenincre = 0;
        this.hasRetFunc = false;
    }
    funcExists(funcName) {
        if (this.vars[funcName]) return true;
        if (this.parent == null) return false;
        return this.parent.funcExists(funcName);
    }
    getType(varname) {
        if (this.vars[varname]) return this.vars[varname];
        if (this.parent == null) throw new Error(`Missing ${varname} declaration.`);
        return this.parent.getType(varname);
    }
    receiveType(varname, type=TYPES.UNKNOWN) {
        if (this.vars[varname]) {
            if (this.vars[varname] != TYPES.UNKNOWN && this.vars[varname] != type) throw new Error(`Variable ${varname} already assigned a type.`)
            this.vars[varname] = type;
        } else if (this.parent == null) throw new Error(`Missing ${varname} declaration.`);
        else this.parent.receiveType(varname, type);
    }
    startTraversal() {
        for (let a = 0; a < this.ast.body.length; a++) {
            this.traverse(this.ast.body[a]);
        }
    }
    getFunctionParams(name) {
        if (this.funcWithParams[name]) return this.funcWithParams[name];
        if (this.parent == null) throw new Error(`Missing ${name} declaration for params.`);
        return this.parent.getType(name);
    }
    debug() {
        console.log(`${"    ".repeat(this.depth)}Codeblock with ${JSON.stringify(this.vars, null, 2)}`);
        for (let c = 0; c < this.children.length; c++) this.children[c].debug();
        if (this.parent == null) console.log("------------------")
    }
    block(a, params = []) {
        let newEnv = new Environment(a, this)
        this.children.push(newEnv);
        for (let i = 0; i < params.length; i++) newEnv.vars[params[i].name] = TYPES.UNKNOWN;
        newEnv.startTraversal();
        return newEnv.type;
    }
    traverse(a) {
        console.log(a)
        switch(a.type) {
            case TOKENS.CODEBLOCK:
                this.block(a);
                break;
            case TOKENS.INT:
                return TYPES.I32;
            case TOKENS.STRING:
                return TYPES.STRING;
            case TOKENS.BOOL:
                return TYPES.BOOL;
            case TOKENS.VOID:
                return TYPES.VOID;
            case TOKENS.ASSIGN:
                if (a.creation) {
                    this.vars[a.name] = this.traverse(a.value);
                } else {
                    this.receiveType(a.name, this.traverse(a.value));
                }
            case TOKENS.IDENT:
                return this.getType(a.name);
            case TOKENS.RETURN:
                this.type = this.traverse(a.value);
                break;
            case TOKENS.FUNCTION:
                this.vars[a.name] = TYPES.UNKNOWN;
                if (Array.isArray(a.body.body)) this.vars[a.name] = this.block(a.body, a.params);
                else {
                    this.vars[a.name] = this.block({
                        type:TOKENS.CODEBLOCK,
                        typecode:Object.keys(TOKENS)[this.type],
                        body:[a.body],
                        literalType:"void",name:""
                    }, a.params);
                }
                this.funcWithParams[a.name] = [a.params, this.children[this.children.length-1]];
                break;
            case TOKENS.AND:
            case TOKENS.OR:
                let l = this.traverse(a.left);
                let r = this.traverse(a.right);
                if (l != TYPES.UNKNOWN && r != TYPES.UNKNOWN) {
                    if (l != r) throw new Error("Mismatching types for comparison.");
                } else if (a.left.type == TOKENS.IDENT) {
                    this.receiveType(a.left.name, TYPES.BOOL);
                }
                if (a.right.type == TOKENS.IDENT) {
                    this.receiveType(a.right.name, TYPES.BOOL);
                }
                return TYPES.BOOL;
            case TOKENS.GREATER_THAN: // if both ends are not defined then they must be integers
            case TOKENS.LESS_THAN: 
                this.traverse(a.left); // traverse for code check
                this.traverse(a.right);
                if (a.left.type == TOKENS.IDENT) {
                    this.receiveType(a.left.name, TYPES.I32);
                }
                if (a.right.type == TOKENS.IDENT) {
                    this.receiveType(a.right.name, TYPES.I32);
                }
                return TYPES.BOOL;
            case TOKENS.EQUALS:
                this.traverse(a.left);
                this.traverse(a.right);
                return TYPES.BOOL;
            case TOKENS.ADD:
            case TOKENS.SUBTRACT:
            case TOKENS.MULTIPLY:
            case TOKENS.DIVIDE:
            case TOKENS.MODULO:
                let ltype = this.traverse(a.left);
                let rtype = this.traverse(a.right);
                if (ltype != TYPES.UNKNOWN && rtype != TYPES.UNKNOWN) {
                    if (ltype != TYPES.I32 || rtype != TYPES.I32) throw new Error("Performing numerical operations on non-numeric type.");
                } else { // assume that they are integers.
                    if (a.left.type == TOKENS.IDENT) {
                        this.receiveType(a.left.name, TYPES.I32);
                    }
                    if (a.right.type == TOKENS.IDENT) {
                        this.receiveType(a.right.name, TYPES.I32);
                    }
                }
                return TYPES.I32;
            case TOKENS.NOT:
                if (this.traverse(a.operand) == TYPES.BOOL || this.traverse(a.operand) == TYPES.UNKNOWN) return TYPES.BOOL;
                throw new Error("Cannot negate a non-boolean type");
            case TOKENS.NEGATE:
                if (this.traverse(a.operand) == TYPES.I32 || this.traverse(a.operand) == TYPES.UNKNOWN) return TYPES.I32;
                throw new Error("Cannot negate a non-integer type");
            case TOKENS.WHILE:
            case TOKENS.IF:
                if (this.traverse(a.conditional) != TYPES.BOOL) throw new Error("IF statement takes boolean statements as its conditional.");
                this.traverse(a.body);
                break;
            case TOKENS.CALL:
                let paramTypes = [];
                for (let p = 0; p < a.params.length; p++) {
                    paramTypes.push(this.traverse(a.params[p]));
                }
                if (this.funcExists(a.name) == false) return TYPES.UNKNOWN;
                let paramev = this.getFunctionParams(a.name);
                if (paramev.length == 2) {
                    let env = paramev[1];
                    for (let i = 0; i < paramev[0].length; i++) {
                        env.receiveType(paramev[0][i].name, paramTypes[i]);
                    }
                    env.startTraversal();
                    this.vars[a.name] = env.type;
                }
                if (this.funcExists(a.name) == false) return TYPES.UNKNOWN;
                return this.getType(a.name);
        }
        return TYPES.UNKNOWN;
    }
    populateAst(ast) {
        switch(ast.type) {
            case -1: 
                this.typedAST = new TypedAST(-1);
                this.typedAST.body = [];
                for (let i = 0; i < ast.body.length; i++) {
                    this.typedAST.body.push(this.populateAst(ast.body[i]));
                }
                return this.typedAST;
            case TOKENS.CODEBLOCK:
                let cb = new TypedAST(TOKENS.CODEBLOCK);
                let envcb = this.children[this.childrenincre];
                cb.valType = envcb.type;
                cb.body = [];
                for (let i = 0; i < ast.body.length; i++) {
                    cb.body.push(envcb.populateAst(ast.body[i]));
                }
                this.childrenincre++;
                return cb;
            case TOKENS.INT:
                return new LiteralTypedAST(TOKENS.INT, TYPES.I32, ast.value);
            case TOKENS.STRING:
                return new LiteralTypedAST(TOKENS.STRING, TYPES.STRING, ast.value);
            case TOKENS.BOOL:
                return new LiteralTypedAST(TOKENS.BOOL, TYPES.BOOL, ast.value == "true" ? 1 : 0);
            case TOKENS.VOID:
                return new LiteralTypedAST(TOKENS.VOID, TYPES.VOID, ast.value);
            case TOKENS.ASSIGN:
                let assign = new TypedAST(TOKENS.ASSIGN, this.getType(ast.name), ast.name);
                assign.creation = ast.creation;
                assign.value = this.populateAst(ast.value);
                return assign;
            case TOKENS.IDENT:
                return new TypedAST(TOKENS.IDENT, this.getType(ast.name), ast.name);
            case TOKENS.RETURN:
                let ret = new TypedAST(TOKENS.RETURN);
                ret.value = this.populateAst(ast.value);
                ret.valType = ret.value.valType;
                this.hasRetFunc = true;
                return ret;
            case TOKENS.FUNCTION:
                let func = new TypedAST(TOKENS.FUNCTION, "void", ast.name);
                func.params = [];
                let envfunc = this.children[this.childrenincre];
                for (let i = 0; i < ast.params.length; i++) {
                    func.params.push(new TypedAST(TOKENS.IDENT, envfunc.getType(ast.params[i].name), ast.params[i].name));
                }
                if (ast.body.type == TOKENS.CODEBLOCK) {
                    func.body = this.populateAst(ast.body);
                } else {
                    func.body = this.populateAst({
                        type:TOKENS.CODEBLOCK,
                        typecode:Object.keys(TOKENS)[this.type],
                        body:[ast.body],
                        literalType:"void",name:""
                    })
                }
                func.valType = func.body.valType;
                if (!envfunc.hasRetFunc) {
                    let r = null;
                    switch(func.valType) {
                        case TYPES.BOOL:
                            r = new TypedAST(TOKENS.RETURN, TYPES.BOOL);
                            r.value = "false";
                            break;
                        case TYPES.STRING:
                            r = new TypedAST(TOKENS.RETURN, TYPES.STRING);
                            r.value = "";
                            break;
                        case TYPES.I32:
                            r = new TypedAST(TOKENS.RETURN, TYPES.I32);
                            r.value = "0";
                            break;
                        case TYPES.VOID:
                            r = new TypedAST(TOKENS.RETURN, TYPES.VOID);
                            r.value = "void";
                            break;
                    }
                    func.body.body.push(r);
                }
                return func;
            case TOKENS.AND:
            case TOKENS.OR:
            case TOKENS.GREATER_THAN:
            case TOKENS.LESS_THAN: 
            case TOKENS.EQUALS:
                let comp = new TypedAST(ast.type, TYPES.BOOL);
                comp.left = this.populateAst(ast.left);
                comp.right = this.populateAst(ast.right);
                return comp;
            case TOKENS.ADD:
            case TOKENS.SUBTRACT:
            case TOKENS.MULTIPLY:
            case TOKENS.DIVIDE:
            case TOKENS.MODULO:
                let mathOperation = new TypedAST(ast.type, TYPES.I32);
                mathOperation.left = this.populateAst(ast.left);
                mathOperation.right = this.populateAst(ast.right);
                return mathOperation;
            case TOKENS.NOT:
                let not = new TypedAST(ast.type, TYPES.BOOL);
                not.operand = this.populateAst(ast.operand);
                return not;
            case TOKENS.NEGATE:
                let neg = new TypedAST(ast.type, TYPES.I32);
                neg.operand = this.populateAst(ast.operand);
                return neg;
            case TOKENS.WHILE:
                let whi = new TypedAST(TOKENS.WHILE, "void", ast.name);
                whi.conditional = this.populateAst(ast.conditional);
                whi.body = this.populateAst(ast.body);
                whi.valType = whi.body.valType;
                return whi;
            case TOKENS.IF:
                let ifc = new TypedAST(TOKENS.IF, "void", ast.name);
                ifc.conditional = this.populateAst(ast.conditional);
                ifc.body = this.populateAst(ast.body);
                ifc.valType = ifc.body.valType;
                return ifc;
            case TOKENS.CALL:
                let callast = new TypedAST(TOKENS.CALL, this.getType(ast.name), ast.name);
                let paramsCall = [];
                for (let i = 0; i < ast.params.length; i++) paramsCall.push(this.populateAst(ast.params[i]));
                callast.params = paramsCall;
                return callast;
            case TOKENS.LOG:
                let logast = new TypedAST(TOKENS.LOG);
                logast.param = this.populateAst(ast.param);
                return logast;
        }
    }
}