function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (value instanceof Array) {
                s = 'array';
            }
        } else {
            s = 'null';
        }
    }
    return s;
}

Template = {};
Template.Tiny = function() {
   var EXPR = "[a-z_][\\w.]*";

   // Opening [% tag including whitespace chomping rules
   var LEFT = "                             \
      (?:                                   \
         (?: (?:^|\\n) [ \\t]* )? \\[\\%\\- \
         |                                  \
         \\[\\% \\+?                        \
      ) \\s*                                \
   ";

   // Closing %] tag including whitespace chomping rules
   var RIGHT  = "                     \
      \\s* (?:                        \
         \\+? \\%\\]                  \
         |                            \
         \\-\\%\\] (?: [ \\t]* \\n )? \
      )                               \
   ";

   // Preparsing run for nesting tags
   var PREPARSE = XRegExp(
      LEFT + "( IF | UNLESS | FOREACH ) \\s+      \
         (                                        \
            (?: \\S+ \\s+ IN \\s+ )?              \
         \\S+ )                                   "
      + RIGHT +
      "(?!                                        \
         .*?"
         +LEFT+"(?: IF | UNLESS | FOREACH ) \\b   \
      )                                           \
      ( .*? )                                     \
      (?:                                         "
        +LEFT+"ELSE" + RIGHT +
        "(?!                                      \
            .*?                                   "
            +LEFT+"(?: IF | UNLESS | FOREACH ) \b \
         )                                        \
         ( .+? )                                  \
      )?                                          "
      + LEFT + "END" + RIGHT
   , "sx");

   // Condition set
   var CONDITION = XRegExp(
     "\\[\\%\\s                      \
         ( ([IUF])\\d+ ) \\s+        \
         (?:                         \
            ([a-z]\\w*) \\s+ IN \\s+ \
         )?                          \
         (" + EXPR + ")              \
      \\s\\%\\]                      \
      ( .*? )                        \
      (?:                            \
         \\[\\%\\s \\1 \\s\\%\\]     \
         ( .+? )                     \
      )?                             \
      \\[\\%\\s \\1 \\s\\%\\]        "
   , "gsx");

   return {
      process: function(copy, stash) {
         stash = stash || {};

         // Preprocess to establish unique matching tag sets
         var id = 0;
         var ran = 1;
         while (ran) {
            ran = 0;
            copy = copy.replace(PREPARSE, function(m, p1, p2, p3, p4) {
               ran = 1;
               var tag = p1.substr(0, 1) + ++id;
               return "[% " + tag + " " + p2 + " %]" + p3 + "[% " + tag + " %]" +
               (p4 ? p4 + "[% " + tag + " %]" : '');
            });
         }

         // Process down the nested tree of conditions
         return this._process( stash, copy );
      },

      _process: function(stash, text) {
         var me = this;
         text = text.replace(CONDITION, function(m, p1, p2, p3, p4, p5, p6) {
               if (p2 === 'F') {
                  return me._foreach(stash, p3, p4, p5);
               } else {
                  if (
                  //(!x !== !y === x xor y)
                     !(p2 === 'U')
                     !==
                     !(me._expression(stash, p4))
                  ) {
                     return me._process(stash, p5);
                  } else {
                     return me._process(stash, p6);
                  }
               }
         });

         // Resolve expressions
         var LEXPRR = XRegExp.cache(LEFT+"("+EXPR+")"+RIGHT, "gsx");
         var me = this;
         text = text.replace(LEXPRR, function(m, p1) {
            return me._expression(stash, p1);
         });

         return text;
      },

      // Special handling for foreach
      _foreach: function (stash, term, expr, text) {
         // Resolve the expression
         var list = this._expression(stash, expr);

         if (typeOf(list) !== 'array') {
            return '';
         }

         // Iterate
         return list.map(function(x) {
               stash[term] = x;
               this._process(stash, text);
         }).join('')
      },

      // Evaluates a stash expression
      _expression: function(cursor, pathStr) {
         var path = pathStr.split(/\./);

         for(var i=0,len=path.length; x=path[i], i<len; i++) {
            // Support for private keys
            if (x.substr(0, 1) === '_') {
               return null;
            }

            // Split by data type
            var type = typeOf(cursor);
            if ( type === 'array' ) {
               var re = new RexExp("^(?:0|[0-9]\\d*)\\z"); // <-- that \z won't fly
               var m = re.exec(x);
               if (m) {
                  return '';
               }
               cursor = cursor[x];
            } else if ( type == 'object' ) {
               cursor = cursor[x];
            } else if ( type ) {
               cursor = cursor[x]();
            } else {
               return '';
            }
         }
         return cursor || '';
      }
   };
}

1;

