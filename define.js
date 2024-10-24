let i = 0;
export const TOKENS = {
    // types
    VOID: i++,
    STRING: i++,
    INT: i++,
    BOOL: i++,
    STRUCT: i++,
    // keywords
    LET: i++,
    LOG: i++,
    IF: i++,
    ELSE: i++,
    WHILE: i++,
    FUNCTION: i++,
    RETURN: i++,
    // operators
    NOT: i++,
    NEGATE: i++,
    AND: i++,
    OR: i++,
    MODULO: i++,
    EQUALS: i++,
    GREATER_THAN: i++,
    LESS_THAN: i++,
    ASSIGN: i++,
    ADD: i++,
    SUBTRACT: i++,
    MULTIPLY: i++,
    DIVIDE: i++,
    DOT: i++,
    DDOT: i++,
    // misc
    OPEN_PARENTHESIS: i++,
    CLOSE_PARENTHESIS: i++,
    OPEN_BRACKET: i++,
    CLOSE_BRACKET: i++,
    COMMA: i++,
    COLON: i++,

    IDENT:  i++, // variable identifier
    CALL: i++,
    CODEBLOCK: i++,
    EOF: i++
}
export class AST {
    constructor(type, name="") {
        this.type = type;
        this.typecode = Object.keys(TOKENS)[this.type];
        this.name = name;
    }
}
export class LiteralAST extends AST {
    constructor(type, value) {
        super(type);
        this.value = value;
    }
}
export class BlockAST extends AST {
    constructor(body) {
        super(TOKENS.CODEBLOCK);
        this.body = [];
        for (let c in body) this.body.push(body[c]);
    }
}
export class FunctionAST extends AST {
    constructor(name, params, blockAST) {
        super(TOKENS.FUNCTION, name);
        this.params = params;
        this.body = blockAST;
    }
}
export class IfAST extends AST {
    constructor(conditional, blockAST) {
        super(TOKENS.IF);
        this.conditional = conditional;
        this.body = blockAST;
    }
}
export class WhileAST extends AST {
    constructor(conditional, blockAST) {
        super(TOKENS.WHILE);
        this.conditional = conditional;
        this.body = blockAST;
    }
}
export class CallAST extends AST {
    constructor(name, params) {
        super(TOKENS.CALL, name);
        this.params = params;
    }
}
export class LogAST extends AST {
    constructor(param) {
        super(TOKENS.LOG);
        this.param = param;
    }
}
export class ReturnAST extends AST {
    constructor(value) {
        super(TOKENS.RETURN);
        this.value = value;
    }
}
export class AssignVarAST extends AST {
    constructor(name, valueAST, creation=false) {
        super(TOKENS.ASSIGN, name);
        this.value = valueAST;
        this.creation = creation;
    }
}
export class IdentAST extends AST {
    constructor(name) {
        super(TOKENS.IDENT, name);
    }
}
export class BinaryOperatorAST extends AST {
    constructor(type, leftAST, rightAST) {
        super(type);
        this.left = leftAST;
        this.right = rightAST;
    }
}
export class UnaryOperatorAST extends AST {
    constructor(type, operandAST) {
        super(type);
        this.operand = operandAST;
    }
}
/*
    Order of Expressions:
    Parenthesis () and their "unary" operation func() or literals
    Logical Unary Operators
    Binary Operators
    Binary Comparison
    Logical Comparison Operators
*/