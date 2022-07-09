"use strict";

const args               = process.argv
                                  .map((arg) => (
                                                  arg.replace(/\"/gm,"")
                                                     .trim()
                                                )
                                  )
                                  .filter((arg) => (
                                                      (arg.length > 0)                          //when Windows-CMD sends arguments using %* is sometimes breaks them, make sure to use "%~1" "%~2" "%~3" "%~4" "%~5" "%~6" "%~7" "%~8" "%~9" instead of %* (limited to 9 arguments).
                                                    &&(false === /[\/\\]node/i.test(arg))       //ignore node.exe (or linux/mac node), based on the fact that the args have a full path
                                                    &&(false === /[\/\\]index\.js/i.test(arg))  //ignore this specific script.
                                                    &&( -1 === arg.toLowerCase().indexOf(process.mainModule.filename.toLowerCase()) )   //same as above, more generic.
                                                   )
                                  )
     ,ARGS_DELIMITER     = "####" //something that would probably never be a part of a real file-name or path...  similar to how arguments are sent to programs from the shell with \0
     ,args_str           = ARGS_DELIMITER + args.join(ARGS_DELIMITER) + ARGS_DELIMITER  //helps you search the arguments as a long string.
     ;

//console.log(args);
//console.log(args_str);
     
const IS_DEBUG_MODE      = (-1 !== args_str.indexOf(ARGS_DELIMITER + "--verbose" + ARGS_DELIMITER))   //master-switch for using the 'log' method below, helps preventing too much output in the STDERR pipe, and keeping it in for its original use of error messages from node.
     ,log                = (true === IS_DEBUG_MODE) ? console.error.bind(console) : (function(){}) //debug logs, uses STDERR pipe for information messages.  for STDOUT use console.out directly (can be used for actual output from the program)
     ,NEWLINE            = require("os").EOL
     ;

if(-1 !== args_str.indexOf(ARGS_DELIMITER + "--help" + ARGS_DELIMITER)){
  console.log( //uses console.log instead of log, since this is a desired output.
      [
       "file_sort file file..  " + "\t\t" + "files to read, natural sort, and write new file. on error, skip (silent)."
      ,"file_sort --help       " + "\t\t" + "show this help."
      ,"file_sort --verbose    " + "\t\t" + "debug mode, show more information (to STDERR)."
      ].join(NEWLINE) + NEWLINE
     );

  process.exitCode=0;
  process.exit();
}


function natural_compare(a,b){
  let ax=[]
     ,bx=[]
    ;
  if("function" === typeof natural_compare.extraction_rule){
   a = natural_compare.extraction_rule(a);
   b = natural_compare.extraction_rule(b);
  }
  a.replace(/(\d+)|(\D+)/g,function(_,$1,$2){ ax.push([$1 || Infinity, $2 || ""]); });
  b.replace(/(\d+)|(\D+)/g,function(_,$1,$2){ bx.push([$1 || Infinity, $2 || ""]); });
  while(ax.length>0 && bx.length>0){
   const an = ax.shift()
      ,bn = bx.shift()
      ,nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1])
      ;
   if(0 !== nn){ return nn; }
  }
  return (ax.length - bx.length);
}


const path               = require("path")
     ,parse_path         = path.parse.bind(path)
     ,resolve_path       = function(input){
                             input = input.replace(/[\/\\]+/g,"/").replace(/\"/g,"");  //single forward-slash to help resolve.
                             input = path.resolve(input).replace(/[\/\\]+/g,"/");      //resolve + normalize to forward-slash.
                             input = input.replace(/\/+$/g,"");                        //normalize to no slash at the end (folders).
                             return input;
                           }
     ,fs                 = require("fs")
     ,is_access          = function(path){
                             try{
                               fs.accessSync(path, (fs.R_OK || fs.constants.R_OK));
                               return true;
                             }catch(err){
                               return false;
                             }
                           }
     ,stats              = function(path){
                             return fs.lstatSync(path, {"bigint"         : false
                                                       ,"throwIfNoEntry" : false
                                                       }
                                                 );
                           }
     ,file_read          = function(path, is_binary){
                             return fs.readFileSync(path, {"encoding" : (true === is_binary ? null : "utf8")
                                                          ,"signal"   : AbortSignal.timeout(10 * 1000)
                                                          }
                                                    );
                           }
     ,file_write         = function(path, content, is_binary){
                             return fs.writeFileSync(path, content, {"encoding" : (true === is_binary ? null : "utf8")
                                                                    ,"signal"   : AbortSignal.timeout(10 * 1000)
                                                                    ,"flag"     : "w"
                                                                    }
                                                    );
                           }

     ,files              = (function(){
                             const files = [];
                             args.forEach(function(file){
                                    const o   = new Object(null)
                                         ,tmp = file
                                         ;
                                    file = resolve_path(tmp);
                                    file = parse_path(file);
                                    file.original = tmp;
                                    file.full     = resolve_path(tmp);
                                    file.output   = resolve_path(file.dir + "/" + file.name + "_sorted" + file.ext);
                                    
                                    if(false === is_access(file.full)){ 
                                      log("[NODE][INFO] can not access [" + file.full + "], skip.");
                                      //in here you can determin that you want to hard-break instead of skipping, you can either throw an error or directly set the exit code to not zero, and exit.
                                      return;
                                    }
                                    
                                    file.stats = stats(file.full);
                                    file.is_file = file.stats.isFile();
                                    if(false === file.is_file){ 
                                      //in here you can determin that you want to hard-break instead of skipping, you can either throw an error or directly set the exit code to not zero, and exit.
                                      log("[NODE][INFO] it is not a file [" + file.full + "], skip.");
                                      return;
                                    }

                                    file.content = file_read(file.full);
                                   
                                    files.push(file);
                                });
                             return files;
                           })()
     ;


log(
  files
);


files.forEach((file) => {
  let tmp = new Object(null); //will be used to remove duplicated lines.
  
  //unique by abusing unique-key aspect of a "map-like" object.
  file.content
      .replace(/[\r\n]+/gm, "\n")
      .split("\n")
      .forEach((line) => { tmp[line] = 123; })  //value does not matter.
      ;

  tmp = Object.keys(tmp);   //grab lines back. array.
  
  tmp = tmp.sort(natural_compare); //sort an array.
  tmp = tmp.join(NEWLINE);         //back to text.
  
  if(false === is_access(file.output)){
    log("[NODE][INFO] writing new file [" + file.output + "]");
  } else {
    log("[NODE][INFO] overwriting existing file [" + file.output + "]");
  }
  
  file_write(file.output, tmp);
  
  if(false === is_access(file.output)){
    log("[NODE][INFO] file [" + file.output + "] is not available, probably write-error..");
  }

});


process.exitCode=0;
process.exit();

