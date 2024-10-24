import {TOKENS} from "./define.js";
import * as AST from "./define.js";

export class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = -1;
        this.functionsTracker = {};
        this.ast = {
            type: -1,
            body: []
        }
    }
    parse() {
        // add the declarations portion
        let start = this.pos;
        while(this.peek.type != TOKENS.EOF && this.peek.type == TOKENS.FUNCTION) {
            this.parseDeclarations(false);
        }
        this.pos = start;
        while(this.peek.type != TOKENS.EOF && this.peek.type == TOKENS.FUNCTION) {
            this.ast.body.push(this.parseDeclarations(true));
        }
        // codebase portion
        while(this.peek.type != TOKENS.EOF) {
            this.ast.body.push(this.parseStatement());
        }
    }
    parseDeclarations(parseFunc) {
        this.next;
        switch(this.token.type) {
            case TOKENS.FUNCTION:
                this.matchNext(TOKENS.IDENT);
                let funcName = this.token.source;
                this.matchNext(TOKENS.COLON);
                let params = [];
                while (this.peek.type == TOKENS.IDENT) {
                    this.next;
                    params.push(new AST.IdentAST(this.token.source));
                    if (this.peek.type == TOKENS.COMMA) {
                        this.next;
                        continue;
                    } else break;
                }
                if (!parseFunc) {
                    this.functionsTracker[funcName] = params.length;
                    while (this.peek.type != TOKENS.EOF && this.peek.type != TOKENS.FUNCTION) this.next;
                } else {
                    return new AST.FunctionAST(funcName, params, this.parseStatement());
                }
        }
    }
    parseStatement() {
        this.next;
        switch (this.token.type) {
            case TOKENS.OPEN_BRACKET:
                let statements = [];
                while (this.peek.type != TOKENS.CLOSE_BRACKET && this.peek.type != TOKENS.EOF) {
                    statements.push(this.parseStatement());
                }
                this.matchNext(TOKENS.CLOSE_BRACKET);
                return new AST.BlockAST(statements);
            case TOKENS.LET:
                this.matchNext(TOKENS.IDENT);
                let name = this.token.source;
                this.matchNext(TOKENS.ASSIGN);
                return new AST.AssignVarAST(name, this.parseExpression(), true);
            case TOKENS.LOG:
                return new AST.LogAST(this.parseExpression());
            case TOKENS.RETURN:
                return new AST.ReturnAST(this.parseExpression());
            case TOKENS.IDENT:
                if (this.nextIs(TOKENS.ASSIGN)) {
                    let name = this.token.source;
                    this.matchNext(TOKENS.ASSIGN);
                    return new AST.AssignVarAST(name, this.parseExpression());
                }
                return this.callFunc();
            case TOKENS.IF:
                return new AST.IfAST(this.parseExpression(), this.parseStatement())
            case TOKENS.WHILE:
                return new AST.WhileAST(this.parseExpression(), this.parseStatement());
            default: 
                throw new Error(`Error on line ${this.token.line}: Unidentified ${this.token.source}.`)
        }
    }
    identOrLiteral() {
        if (this.isLiteral(this.token)) {
            return this.parseLiteral(this.token);
        }
        return this.isFuncOrVar();
    }
    isFuncOrVar() {
        if (this.functionsTracker[this.token.source] != null) {
            return this.callFunc();
        }
        return new AST.IdentAST(this.token.source);
    }
    callFunc() {
        let numArgs = this.functionsTracker[this.token.source];
        if (numArgs > 0) {
            return new AST.CallAST(this.token.source, this.callFuncArgs(numArgs));
        }
        return new AST.CallAST(this.token.source, []);
    }
    callFuncArgs(argNum) {
        let args = [];
        for (let i = 0; i < argNum - 1; i++) {
            args.push(this.parseExpression());
            this.matchNext(TOKENS.COMMA);
        }
        args.push(this.parseExpression());
        return args;
    }
    parseExpression() {
        this.next;
        let expression = this.logicalComparisonOperators();
        /*
        Order of Expressions:
        Parenthesis () and their "unary" operation func() or literals
        Logical Unary Operators !a, -a
        Binary Operators a + b, a - b, a * b, a / b, a % b
        Binary Comparison a == b, a <>= b
        Logical Comparison Operators a && b, a || b
        */
       return expression;
    }
    logicalComparisonOperators() {
        let expression = this.binaryComparisonOperators();
        if (this.nextIs(TOKENS.AND, TOKENS.OR)) {
            this.next;
            let type = this.token.type;
            this.next;
            return new AST.BinaryOperatorAST(type, expression, this.logicalComparisonOperators());
        }
        return expression;
    }
    binaryComparisonOperators() {
        let expression = this.binaryOperators();
        if (this.nextIs(TOKENS.EQUALS, TOKENS.GREATER_THAN, TOKENS.LESS_THAN)) {
            this.next;
            let type = this.token.type;
            this.next;
            return new AST.BinaryOperatorAST(type, expression, this.binaryComparisonOperators());
        }
        return expression;
    }
    binaryOperators() {
        let expression = this.binaryOperators2();
        if (this.nextIs(TOKENS.ADD, TOKENS.SUBTRACT)) {
            this.next;
            let type = this.token.type;
            this.next;
            return new AST.BinaryOperatorAST(type, expression, this.binaryOperators());
        }
        return expression;
    }
    binaryOperators2() {
        let expression = this.unaryOperators();
        if (this.nextIs(TOKENS.MULTIPLY, TOKENS.DIVIDE, TOKENS.MODULO)) {
            this.next;
            let type = this.token.type;
            this.next;
            return new AST.BinaryOperatorAST(type, expression, this.binaryOperators2());
        }
        return expression;
    }
    unaryOperators() {
        if (this.token.type == TOKENS.SUBTRACT || this.token.type == TOKENS.NOT) {
            let type = this.token.type == TOKENS.SUBTRACT ? TOKENS.NEGATE : this.token.type;
            this.next;
            return new AST.UnaryOperatorAST(type, this.unaryOperators());
        }
        return this.parenthesisOperations();
    }
    parenthesisOperations() {
        let expression = 0;
        if (this.token.type == TOKENS.OPEN_PARENTHESIS) {
            expression = this.parseExpression();
        }
        if (expression == 0) return this.identOrLiteral();
        this.matchNext(TOKENS.CLOSE_PARENTHESIS);
        return expression;
    }
    isLiteral(token) {
        return token.type == TOKENS.VOID || token.type == TOKENS.INT || token.type == TOKENS.STRING || token.type == TOKENS.BOOL;   
    }
    parseLiteral(token) {
        return new AST.LiteralAST(token.type, token.source);
    }
    get tokensUntilNewLine() {
        let currLine = this.token.line;
        let tokens = [];
        this.next;
        while(this.token.line != currLine) {
            tokens.push(this.token);
            this.next;
        }
        return tokens;
    }
    get next() {
        this.pos++;
    }
    get token() {
        return this.tokens[this.pos];
    }
    get peek() {
        return this.tokens[this.pos + 1];
    }
    get last() {
        return this.tokens[this.pos - 1];
    }
    matchNext(token) {
        if (this.peek.type == token) {
            this.next;
            return true;
        }
        throw new Error(`Missing token ${Object.keys(TOKENS)[token]}`);
    }
    nextIs(...types) {
        for (let i = 0; i < types.length; i++) {
            if (this.peek.type == types[i]) return true;
        }
        return false;
    }
}