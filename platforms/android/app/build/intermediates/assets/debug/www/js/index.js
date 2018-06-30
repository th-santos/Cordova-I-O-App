// Logcat command-line for debugging:
// adb logcat ActivityManager:I Cordova I/O App:V -e INFO:CONSOLE*

// cordova-plugin-file documentation:
// http://cordova.apache.org/docs/en/latest/reference/cordova-plugin-file/index.html#readFile

$(function() {
    // MODEL
    var root;

    // CONTROLLER
    var app = {
        init: function () {
            document.addEventListener(
                'deviceready',
                function () {
                    console.log('Device ready');
                    view.init();

                    window.resolveLocalFileSystemURL(
                        cordova.file.externalRootDirectory,
                        function (dirEntry) {
                            // console.log('dirEntry Object:\n' + JSON.stringify(dirEntry, null, 4));
                            root = dirEntry;
                        },
                        function (error) {
                            app.showError(error);
                            view.showToast('File system not initiated.', 'long', true);
                        }
                    );
                }, 
                false
            );
        },

        getRoot: function () {
            return root.nativeURL;
        },

        askAccess: function() {
            // force ask for access to device at first usage
            root.getDirectory(
                '/', 
                null, 
                () => {
                    console.log('Access allowed');
                    return true;
                },  
                () => {
                    console.log('Access not allowed');
                    view.showToast('You need to give the app access to use all the features.', 'long', true);
                    return false;
                }
            );
        },

        getFile: function (fileName, fileContent, isAppend) {
            let options = (fileContent !== null) ? {create: true, exclusive: false} : null;

            // create a new file or returns the file if it already exists
            root.getFile(
                fileName,
                options,
                function(fileEntry) {
                    // console.log('fileEntry Object:\n' + JSON.stringify(fileEntry, null, 4));

                    if (fileContent !== null) app.write(fileEntry, fileContent, isAppend);
                    else app.read(fileEntry);
                },
                function (error) {
                    app.showError(error);
                    view.showToast('File does not exist or it is inaccessible.', 'long', true);
                }
            );
        },

        write: function (fileEntry, fileContent, isAppend) {
            // create a fileWriter object for fileEntry
            fileEntry.createWriter(
                function (fileWriter) {
                    fileWriter.onwriteend = function() {
                        console.log('Successful file write!\nFile content:\n' + fileContent);
                        view.showToast('Successful file write!', 'long', true);
                    };
                    
                    fileWriter.onerror = function (error) {
                        app.showError(error);
                        view.showToast('Failed file write!', 'long', true);
                    };

                    // if we are appending data to file, go to the end of the file
                    if (isAppend) {
                        try {
                            fileWriter.seek(fileWriter.length);
                            fileContent = `\n${fileContent}`;
                        }
                        catch (error) {
                            app.showError(error);
                            view.showToast('Failed append content!', 'long', true);
                        }
                    }
        
                    // create Blob type
                    let dataObj = new Blob([fileContent], {type: 'text/plain'});
        
                    fileWriter.write(dataObj);
                }
            );

            if (this.lastDir) this.listPath(this.lastDir);
        },

        read: function (fileEntry) {
            fileEntry.file(
                function (file) {
                    let reader = new FileReader();
            
                    reader.onloadend = function() {
                        console.log('Successful file read!\nFile content:\n' + this.result);
                        view.showToast('Successful file read!', 'short', false);
                        view.renderWriteRead(this.result);
                    };
            
                    reader.readAsText(file);
                },
                function (error) {
                    app.showError(error);
                    view.showToast('Failed file read!', 'long', true);
                }
            );
        },

        writeFile: function (fileName, fileContent, isAppend) {
            this.getFile(fileName, fileContent, isAppend);
        },

        readFile: function (fileName) {
            this.getFile(fileName, null, null);
        },

        listPath: function (dir = null) {
            if (!dir) dir = root;
            this.lastDir = dir;

            let directoryReader = dir.createReader();

            directoryReader.readEntries(
                function (entries) {
                    let entriesArray = [];
                    let path = dir.nativeURL.replace(root.nativeURL, '')
                        .split('/').filter(value => /\S/.test(value));

                    for (let i = 0; i < entries.length; i++) {
                        let row = entries[i];
                        
                        if (!row.name.startsWith('.')) {
                            entriesArray.push({
                                name: row.name,
                                nativeURL: row.nativeURL,
                                isDirectory: row.isDirectory
                            });
                        }
                    }

                    entriesArray.sort(
                        (a, b) => (+b.isDirectory) - (+a.isDirectory) || a.name.localeCompare(b.name, undefined, {sensitivity: 'base'})
                    );

                    view.renderFileExplorer(path, entriesArray);
                },
                function (error) {
                    app.showError(error);
                }
            );
        },

        changePath: function (path) {
            window.resolveLocalFileSystemURL(
                path,
                function (dirEntry) {
                    // console.log('dirEntry Object:\n' + JSON.stringify(dirEntry, null, 4));
                    this.lastDir = dirEntry;
                    app.listPath(dirEntry);
                },
                function (error) {
                    app.showError(error);
                }
            );
        },

        resetLastDir: function () {
            this.lastDir = null;
        },

        showError: function (error) {
            console.log('error Object:\n' + JSON.stringify(error, null, 4));
        }
    };

    var view = {
        init: function () {
            // WRITE SECTION
            this.$inputFileName = $('#input-file-name');
            this.$textareaFileContent = $('#textarea-file-content');
            this.$btnWriteFile = $('#btn-write-file');

            // READ SECTION
            this.$headReadFile = $('#head-read-file');
            this.$divFileContent = $('#div-file-content');
            this.$btnReadFile = $('#btn-read-file');

            // FILE EXPLORER SECTION
            this.$btnFileExplorer = $('#btn-file-explorer');
            this.$path = $('#path');
            this.$uiFilterable = $('.ui-filterable');
            this.$ulFileExplorer = $('#file-explorer');

            // remove <form class="ui-filterable"></form>
            this.$uiFilterable.detach();

            // Event Listeners
            this.$btnWriteFile.click(() => {view.getInputsAnd('write');});
            this.$btnReadFile.click(() => {view.getInputsAnd('read');});
            this.$btnFileExplorer.click(() => {
                if (app.askAccess()) app.listPath();
            });
        },

        getInputsAnd: function (option) {
            // get fileName
            let fileName = this.$inputFileName.val();
            
            // check if fileName is valid
            if (fileName && typeof fileName == 'string') {
                switch (option) {
                    case 'write':
                        let fileContent = this.$textareaFileContent.val();
                        let writeOption = $('[name="write-option"]:checked').val();

                        if (writeOption == 'overwrite') app.writeFile(fileName, fileContent, false);
                        else if (writeOption == 'append') app.writeFile(fileName, fileContent, true);
                        break;
                    case 'read':
                        app.readFile(fileName);
                        break;
                }
            } else {
                console.log('renderWriteFile: Invalid file name!');
                view.showToast('Invalid file name.', 'long', true);
            }
        },

        renderFileExplorer: function (path, entries) {
            // change button text and add event listener
            this.$btnFileExplorer.text('Hide Directory Contents')
                .off()
                .click(() => {view.resetFileExplorer();});

            // reset some elements before render it
            this.$path.empty();
            this.$uiFilterable.detach();
            this.$ulFileExplorer.empty();

            // get variables to be worked
            let trail = [app.getRoot()];
            let up = trail[0] + path.join('/').replace(/[^\/]+$/, '');

            // RENDER THE BREADCRUMB TRAIL
            // template generators
            function btnUpTemplate (tempClass) {
                return `<button class="ui-btn ui-btn-inline ui-icon-arrow-u ui-btn-icon-notext ui-corner-all btn-up ${tempClass}"></button>`;
            }

            function pathTemplate (tempClass, tempText, hasSpan = null) {
                let tempSpan = hasSpan ? '<span> / </span>' : '';
                return `${tempSpan}<button data-inline="true" data-shadow="false" class="trail ${tempClass}">${tempText}</button>`;
            }

            // check if we are in the root directory or not
            if (path.length < 1) {
                $(btnUpTemplate(null))
                    .appendTo(view.$path);
                $(pathTemplate(null, 'root'))
                    .appendTo(view.$path);
            } else {
                $(btnUpTemplate('path-active'))
                    .appendTo(view.$path)
                    .click(() => {app.changePath(up);});            

                $(pathTemplate('path-active', 'root'))
                    .appendTo(view.$path)
                    .click(() => {app.listPath();});

                // render the rest of the trail
                $.each(
                    path, 
                    function(index, value) {
                        // check if it is the last path or not
                        if (index + 1 < path.length) {
                            trail[index + 1] = trail[index] + `${value}/`;
                            $(pathTemplate('path-active', value, true))
                                .appendTo(view.$path)
                                .click(() => {app.changePath(trail[index + 1]);});
                        } else {
                            $(pathTemplate(null, value, true))
                                .appendTo(view.$path);
                        }
                    }
                );
            }

            // render jQuery Mobile dynamically
            this.$path.enhanceWithin();
            
            // RENDER DIRECTORIES AND FILES
            // template generators
            function fileExpTemplate (isFolder, tempName) {
                let tempItem = isFolder ? 'folder' : 'file';
                let tempLink = isFolder ? ['<a href="#">', '</a>'] : ['', ''];
                return `<li>${tempLink[0]}<img src="./img/${tempItem}.png" class="ui-li-icon ui-corner-none">${tempName}${tempLink[1]}</li>`;
            }

            $.each(
                entries,
                function(index, value) {
                    if (value.isDirectory) {
                        $(fileExpTemplate(true, value.name))
                        .appendTo(view.$ulFileExplorer)
                        .click(() => {app.changePath(value.nativeURL);});
                    } else {
                        $(fileExpTemplate(false, value.name))
                        .appendTo(view.$ulFileExplorer);
                    }
                }
            );

            // show <form class="ui-filterable"></form>
            this.$uiFilterable.insertAfter(view.$path);

            // render listview (jQuery Mobile) dynamically
            this.$ulFileExplorer.listview('refresh');
        },
        
        resetFileExplorer: function () {
            // reset file explorer
            this.$path.empty();
            this.$uiFilterable.detach();
            this.$ulFileExplorer.empty();

            // change button text and add event listener
            this.$btnFileExplorer.text('Show Directory Contents')
                .off()
                .click(() => {app.listPath();});

            app.resetLastDir();
        },

        showToast: function (message, type, clear) {
            // show toast message
            if (type == 'long') AndroidToast.showLongToast(message);
            if (type == 'short') AndroidToast.showShortToast(message);

            // reset view if: clear = true
            if (clear) {
                this.$textareaFileContent.val('');
                this.$headReadFile.addClass('hidden');
                this.$divFileContent.addClass('hidden');
                this.$divFileContent.empty();
            }
        },
        
        renderWriteRead: function (content) {
            this.$textareaFileContent.val('');
            this.$divFileContent.text(content);
            this.$headReadFile.removeClass('hidden');
            this.$divFileContent.removeClass('hidden');
        }
    };

    // call controller
    app.init();
});