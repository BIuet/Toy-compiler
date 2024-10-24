import {TOKENS} from "./define.js";

class Token {
    constructor(type, line, source="") {
        this.type = type;
        this.typecode = Object.keys(TOKENS)[this.type];
        this.line = line;
        this.source = source;
    }
}

export class Lexer {
    constructor(source, filename) {
        this.source = source;
        this.pos = -1;
        this.start = 0;
        this.tokens = [];
        this.line = 1;
        this.filename = filename;
    }
    tokenize() {
        while (!this.isEOF) {
            this.next;
            this.start = this.pos;
            this.eat();
        }
        this.start = this.pos;
        this.pushToken(TOKENS.EOF); //EOF push
    }
    eat() {
        switch(this.char) {
            case '\t': 
            case '\r':
            case ' ': break;
            case '\n': this.line++; break;
            //case '.': this.pushToken(this.nextIs('.') ? TOKENS.DDOT : TOKENS.DOT); break;
            case ',': this.pushToken(TOKENS.COMMA); break;
            case ':': this.pushToken(TOKENS.COLON); break;
            case '(': this.pushToken(TOKENS.OPEN_PARENTHESIS); break;
            case ')': this.pushToken(TOKENS.CLOSE_PARENTHESIS); break;
            case '{': this.pushToken(TOKENS.OPEN_BRACKET); break;
            case '}': this.pushToken(TOKENS.CLOSE_BRACKET); break;
            case '+': this.pushToken(TOKENS.ADD); break;
            case '*': this.pushToken(TOKENS.MULTIPLY); break;
            case '-': this.pushToken(TOKENS.SUBTRACT); break;
            case '!': this.pushToken(TOKENS.NOT); break;
            case '%': this.pushToken(TOKENS.MODULO); break;
            case '<': this.pushToken(TOKENS.LESS_THAN); break;
            case '>': this.pushToken(TOKENS.GREATER_THAN); break;
            case '/': {
                if (this.char == '/' && this.nextIs('/')) {
                    this.next;
                    while(!(this.char == '/' && this.nextIs('/'))) {
                        this.next;
                        if (this.isEOF) {
                            break;
                        } 
                    }
                    console.log(this.sourcePart);
                } else {
                    this.pushToken(TOKENS.DIVIDE);
                }
            } break;
            case '=': this.pushToken(this.nextIs('=') ? TOKENS.EQUALS : TOKENS.ASSIGN); break;
            case '&': this.pushToken(this.nextIs('&') ? TOKENS.AND : TOKENS.AND); break;
            case '|': this.pushToken(this.nextIs('|') ? TOKENS.OR : TOKENS.OR); break;
            case '"': {
                if (!this.nextIs('"')) {
                    this.next;
                    this.start = this.pos;
                    while (this.peek != '"') {
                        if (this.isEOF) {
                            throw new Error("Incomplete string at End of File.");
                        } 
                        this.next;
                    }
                }
                this.pushToken(TOKENS.STRING);
                this.next;
            } break;
            default: {
                if (this.isDigit(this.char)) { // int
                    while (this.isDigit(this.peek)) {
                        this.next;
                    }
                    this.pushToken(TOKENS.INT);
                } else if (this.isIdentifierChar(this.char, true)) { // build identifiers
                    while (this.isIdentifierChar(this.peek, false) && !this.isEOF) {
                        this.next;
                    }
                    switch(this.sourcePart) {
                        case "void": this.pushToken(TOKENS.VOID); break;
                        case "true":
                        case "false": this.pushToken(TOKENS.BOOL); break;
                        //case "struct": this.pushToken(TOKENS.STRUCT); break;
                        case "let": this.pushToken(TOKENS.LET); break;
                        case "log": this.pushToken(TOKENS.LOG); break;
                        case "if": this.pushToken(TOKENS.IF); break;
                        case "else": this.pushToken(TOKENS.ELSE); break;
                        case "while": this.pushToken(TOKENS.WHILE); break;
                        case "fn":
                            this.pushToken(TOKENS.FUNCTION); break;
                        case "return": this.pushToken(TOKENS.RETURN); break;
                        case "let": this.pushToken(TOKENS.LET); break;
                        default: this.pushToken(TOKENS.IDENT); break;
                    }
                }
            } break;
        }
    }
    get next() {
        this.pos++;
    }
    skipToSpace() {
        while ((this.char != ' ' || this.char != '\t' || this.char != '\n') && !this.isEOF) {
            this.next;
        }
    }
    get isEOF() {
        return this.pos >= this.source.length;
    }
    isDigit(c) {
        return c >= "0" && c <= "9";
    }
    isIdentifierChar(c, isFirst) {
        // if isFirst is True, then accept no numbers.
        return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c == '_' || (!isFirst && this.isDigit(c)) 
    }
    get char() {
        return this.source.charAt(this.pos);
    }
    get peek() {
        return this.source.charAt(this.pos+1);
    }
    nextIs(match) {
        if (this.peek != match) return false;
        this.next;
        return true;
    }
    get sourcePart() {
        return this.source.substring(this.start, this.pos+1);
    }
    pushToken(type) {
        this.tokens.push(new Token(type, this.line, this.sourcePart));
    }
}