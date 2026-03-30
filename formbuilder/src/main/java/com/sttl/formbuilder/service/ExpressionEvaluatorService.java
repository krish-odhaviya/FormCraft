package com.sttl.formbuilder.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ExpressionEvaluatorService {

    public boolean evaluate(String expression, Map<String, Object> data) {
        if (expression == null || expression.trim().isEmpty()) {
            return true;
        }
        try {
            List<Token> tokens = tokenize(expression);
            Parser parser = new Parser(tokens, data);
            Object result = parser.parseExpression();
            return isTrue(result);
        } catch (Exception e) {
            System.err.println("Expression Evaluation Error: [" + expression + "] | Available Keys: " + (data != null ? data.keySet() : "none") + " | Error: " + e.getMessage());
            return false;
        }
    }

    private boolean isTrue(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean) return (Boolean) o;
        if (o instanceof String) return !((String) o).isEmpty();
        if (o instanceof Number) return ((Number) o).doubleValue() != 0;
        return true;
    }

    // --- Tokenizer ---
    enum TokenType {
        AND("&&"), OR("\\|\\|"), NOT("!"),
        EQ("=="), NEQ("!="), GTE(">="), LTE("<="), GT(">"), LT("<"),
        LP("\\("), RP("\\)"),
        NUMBER("-?\\d+(\\.\\d+)?"),
        STRING("'[^']*'"),
        IDENTIFIER("[a-zA-Z_][a-zA-Z0-9_]*"),
        WHITESPACE("\\s+");

        public final Pattern pattern;

        TokenType(String regex) {
            this.pattern = Pattern.compile("^" + regex);
        }
    }

    static class Token {
        public final TokenType type;
        public final String value;

        Token(TokenType type, String value) {
            this.type = type;
            this.value = value;
        }

        @Override
        public String toString() {
            return type + "(" + value + ")";
        }
    }

    private List<Token> tokenize(String input) {
        List<Token> tokens = new ArrayList<>();
        String s = input;
        while (!s.isEmpty()) {
            boolean matched = false;
            for (TokenType tt : TokenType.values()) {
                Matcher m = tt.pattern.matcher(s);
                if (m.find()) {
                    matched = true;
                    String val = m.group();
                    if (tt != TokenType.WHITESPACE) {
                        tokens.add(new Token(tt, val));
                    }
                    s = s.substring(val.length());
                    break;
                }
            }
            if (!matched) {
                throw new RuntimeException("Unexpected character at: " + s);
            }
        }
        return tokens;
    }

    // --- Recursive Descent Parser ---
    static class Parser {
        private final List<Token> tokens;
        private final Map<String, Object> data;
        private int pos = 0;

        Parser(List<Token> tokens, Map<String, Object> data) {
            this.tokens = tokens;
            this.data = data;
        }

        private Token peek() {
            return (pos < tokens.size()) ? tokens.get(pos) : null;
        }

        private Token eat() {
            Token t = peek();
            if (t != null) pos++;
            return t;
        }

        private boolean check(TokenType type) {
            Token t = peek();
            return t != null && t.type == type;
        }

        private void match(TokenType type) {
            if (!check(type)) {
                throw new RuntimeException("Expected " + type + ", got " + (peek() != null ? peek().type : "EOF"));
            }
            eat();
        }

        // Grammar:
        // Expression -> LogicalOr
        // LogicalOr  -> LogicalAnd ( '||' LogicalAnd )*
        // LogicalAnd -> Equality ( '&&' Equality )*
        // Equality   -> Comparison ( ('=='|'!=') Comparison )*
        // Comparison -> Unary ( ('>'|'<'|'>='|'<=') Unary )*
        // Unary      -> '!' Unary | Primary
        // Primary    -> ( Expression ) | NUMBER | STRING | IDENTIFIER

        public Object parseExpression() {
            return parseLogicalOr();
        }

        private Object parseLogicalOr() {
            Object left = parseLogicalAnd();
            while (check(TokenType.OR)) {
                eat();
                Object right = parseLogicalAnd();
                left = asBoolean(left) || asBoolean(right);
            }
            return left;
        }

        private Object parseLogicalAnd() {
            Object left = parseEquality();
            while (check(TokenType.AND)) {
                eat();
                Object right = parseEquality();
                left = asBoolean(left) && asBoolean(right);
            }
            return left;
        }

        private Object parseEquality() {
            Object left = parseComparison();
            while (check(TokenType.EQ) || check(TokenType.NEQ)) {
                Token op = eat();
                Object right = parseComparison();
                if (op.type == TokenType.EQ) {
                    left = compare(left, right) == 0;
                } else {
                    left = compare(left, right) != 0;
                }
            }
            return left;
        }

        private Object parseComparison() {
            Object left = parseUnary();
            while (check(TokenType.GT) || check(TokenType.LT) || check(TokenType.GTE) || check(TokenType.LTE)) {
                Token op = eat();
                Object right = parseUnary();
                int cmp = compare(left, right);
                if (op.type == TokenType.GT) left = cmp > 0;
                else if (op.type == TokenType.LT) left = cmp < 0;
                else if (op.type == TokenType.GTE) left = cmp >= 0;
                else if (op.type == TokenType.LTE) left = cmp <= 0;
            }
            return left;
        }

        private Object parseUnary() {
            if (check(TokenType.NOT)) {
                eat();
                return !asBoolean(parseUnary());
            }
            return parsePrimary();
        }

        private Object parsePrimary() {
            Token t = eat();
            if (t == null) throw new RuntimeException("Unexpected end of expression");

            if (t.type == TokenType.LP) {
                Object val = parseExpression();
                match(TokenType.RP);
                return val;
            } else if (t.type == TokenType.NUMBER) {
                return Double.parseDouble(t.value);
            } else if (t.type == TokenType.STRING) {
                return t.value.substring(1, t.value.length() - 1);
            } else if (t.type == TokenType.IDENTIFIER) {
                return data.get(t.value);
            } else {
                throw new RuntimeException("Unexpected token style: " + t.value);
            }
        }

        private boolean asBoolean(Object o) {
            if (o == null) return false;
            if (o instanceof Boolean) return (Boolean) o;
            if (o instanceof String) return !((String) o).isEmpty() && !((String) o).equals("false");
            if (o instanceof Number) return ((Number) o).doubleValue() != 0;
            return true;
        }

        private int compare(Object a, Object b) {
            if (a == null && b == null) return 0;
            if (a == null) return -1;
            if (b == null) return 1;

            if (a instanceof Number || b instanceof Number) {
                double da = parseNumber(a);
                double db = parseNumber(b);
                return Double.compare(da, db);
            }

            return a.toString().compareTo(b.toString());
        }

        private double parseNumber(Object o) {
            if (o == null) return 0;
            if (o instanceof Number) return ((Number) o).doubleValue();
            try {
                return Double.parseDouble(o.toString());
            } catch (Exception e) {
                return 0;
            }
        }
    }
}
