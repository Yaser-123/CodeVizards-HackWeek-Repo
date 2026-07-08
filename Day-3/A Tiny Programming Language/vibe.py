import re
import sys

# --- LEXER ---
TOKEN_SPEC = [
    ('NUMBER',   r'\d+'),
    ('STRING',   r'"[^"]*"'),
    ('IDENT',    r'[A-Za-z_]\w*'),
    ('COMP',     r'==|!=|<=|>=|<|>'),
    ('ASSIGN',   r'='),
    ('ARITH',    r'[+\-*/%]'),
    ('LBRACE',   r'\{'),
    ('RBRACE',   r'\}'),
    ('LPAREN',   r'\('),
    ('RPAREN',   r'\)'),
    ('WS',       r'\s+'),
    ('COMMENT',  r'#.*'),
    ('MISMATCH', r'.'),
]

KEYWORDS = {
    'snatched': 'LET',
    'keep_cooking': 'WHILE',
    'sus': 'IF',
    'cap': 'ELSE',
    'spill': 'PRINT',
}

class Token:
    def __init__(self, type, value, line):
        self.type = type
        self.value = value
        self.line = line
    def __repr__(self):
        return f"Token({self.type}, {self.value})"

def tokenize(code):
    tokens = []
    tok_regex = '|'.join(f'(?P<{pair[0]}>{pair[1]})' for pair in TOKEN_SPEC)
    line_num = 1
    for mo in re.finditer(tok_regex, code):
        kind = mo.lastgroup
        value = mo.group()
        if kind == 'WS':
            line_num += value.count('\n')
            continue
        elif kind == 'COMMENT':
            continue
        elif kind == 'IDENT' and value in KEYWORDS:
            kind = KEYWORDS[value]
        elif kind == 'MISMATCH':
            raise RuntimeError(f"Unexpected character {value!r} on line {line_num}")
        tokens.append(Token(kind, value, line_num))
    tokens.append(Token('EOF', '', line_num))
    return tokens

# --- PARSER ---
class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def match(self, *expected_types):
        if self.pos < len(self.tokens) and self.tokens[self.pos].type in expected_types:
            tok = self.tokens[self.pos]
            self.pos += 1
            return tok
        return None

    def expect(self, expected_type):
        tok = self.match(expected_type)
        if not tok:
            raise SyntaxError(f"Expected {expected_type}, got {self.tokens[self.pos].type} at line {self.tokens[self.pos].line}")
        return tok

    def parse(self):
        statements = []
        while self.tokens[self.pos].type != 'EOF':
            statements.append(self.parse_statement())
        return statements

    def parse_statement(self):
        if self.match('LET'):
            ident = self.expect('IDENT').value
            self.expect('ASSIGN')
            expr = self.parse_expr()
            return ('LET', ident, expr)
        elif self.match('PRINT'):
            expr = self.parse_expr()
            return ('PRINT', expr)
        elif self.match('WHILE'):
            cond = self.parse_expr()
            body = self.parse_block()
            return ('WHILE', cond, body)
        elif self.match('IF'):
            cond = self.parse_expr()
            body = self.parse_block()
            elif_blocks = []
            else_block = None
            
            while self.match('ELSE'):
                if self.match('IF'): # cap sus
                    elif_cond = self.parse_expr()
                    elif_body = self.parse_block()
                    elif_blocks.append((elif_cond, elif_body))
                else: # cap
                    else_block = self.parse_block()
                    break
            
            return ('IF', cond, body, elif_blocks, else_block)
        elif self.tokens[self.pos].type == 'IDENT':
            # Could be assignment without let
            ident = self.expect('IDENT').value
            self.expect('ASSIGN')
            expr = self.parse_expr()
            return ('ASSIGN', ident, expr)
        else:
            raise SyntaxError(f"Unexpected token {self.tokens[self.pos]} at line {self.tokens[self.pos].line}")

    def parse_block(self):
        self.expect('LBRACE')
        statements = []
        while not self.match('RBRACE'):
            statements.append(self.parse_statement())
        return statements

    def parse_expr(self):
        left = self.parse_term()
        tok = self.match('COMP')
        if tok:
            right = self.parse_term()
            left = ('COMP', tok.value, left, right)
        return left

    def parse_term(self):
        left = self.parse_factor()
        while True:
            tok = self.match('ARITH')
            if tok and tok.value in ('+', '-'):
                right = self.parse_factor()
                left = ('ARITH', tok.value, left, right)
            elif tok:
                # Need to backtrack because it's not + or -
                self.pos -= 1
                break
            else:
                break
        return left

    def parse_factor(self):
        left = self.parse_primary()
        while True:
            tok = self.match('ARITH')
            if tok and tok.value in ('*', '/', '%'):
                right = self.parse_primary()
                left = ('ARITH', tok.value, left, right)
            elif tok:
                self.pos -= 1
                break
            else:
                break
        return left

    def parse_primary(self):
        if tok := self.match('NUMBER'):
            return ('NUMBER', int(tok.value))
        elif tok := self.match('STRING'):
            return ('STRING', tok.value[1:-1]) # strip quotes
        elif tok := self.match('IDENT'):
            return ('VAR', tok.value)
        elif self.match('LPAREN'):
            expr = self.parse_expr()
            self.expect('RPAREN')
            return expr
        else:
            raise SyntaxError(f"Expected expression, got {self.tokens[self.pos]} at line {self.tokens[self.pos].line}")

# --- EVALUATOR ---
class Evaluator:
    def __init__(self):
        self.env = {}

    def eval(self, node):
        node_type = node[0]
        if node_type == 'NUMBER' or node_type == 'STRING':
            return node[1]
        elif node_type == 'VAR':
            if node[1] not in self.env:
                raise NameError(f"Variable '{node[1]}' not defined")
            return self.env[node[1]]
        elif node_type == 'ARITH':
            op, left, right = node[1], self.eval(node[2]), self.eval(node[3])
            if op == '+': return left + right
            elif op == '-': return left - right
            elif op == '*': return left * right
            elif op == '/': return left // right # integer division
            elif op == '%': return left % right
        elif node_type == 'COMP':
            op, left, right = node[1], self.eval(node[2]), self.eval(node[3])
            if op == '==': return left == right
            elif op == '!=': return left != right
            elif op == '<': return left < right
            elif op == '<=': return left <= right
            elif op == '>': return left > right
            elif op == '>=': return left >= right
        elif node_type == 'LET' or node_type == 'ASSIGN':
            self.env[node[1]] = self.eval(node[2])
        elif node_type == 'PRINT':
            val = self.eval(node[1])
            print(val)
        elif node_type == 'WHILE':
            while self.eval(node[1]):
                for stmt in node[2]:
                    self.eval(stmt)
        elif node_type == 'IF':
            _, cond, body, elifs, else_body = node
            if self.eval(cond):
                for stmt in body:
                    self.eval(stmt)
            else:
                executed = False
                for e_cond, e_body in elifs:
                    if self.eval(e_cond):
                        for stmt in e_body:
                            self.eval(stmt)
                        executed = True
                        break
                if not executed and else_body:
                    for stmt in else_body:
                        self.eval(stmt)
        else:
            raise NotImplementedError(f"Cannot evaluate {node_type}")

    def execute(self, statements):
        for stmt in statements:
            self.eval(stmt)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python vibe.py <script.vibe>")
        sys.exit(1)
        
    with open(sys.argv[1], 'r') as f:
        code = f.read()
        
    try:
        tokens = tokenize(code)
        parser = Parser(tokens)
        ast = parser.parse()
        evaluator = Evaluator()
        evaluator.execute(ast)
    except Exception as e:
        print(f"ERROR: {e}")
