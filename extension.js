/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */
const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const St = imports.gi.St;

const Main = imports.ui.main;
const Workspace = imports.ui.workspace;
const WorkspacesView = imports.ui.workspacesView;

function injectToFunction(parent, name, func) {
    let origin = parent[name];
    parent[name] = function() {
        let ret;
        ret = origin.apply(this, arguments);
        if (ret === undefined)
            ret = func.apply(this, arguments);
        return ret;
    }
    return origin;
}

let winInjections, workspaceInjections, workViewInjections, createdActors, connectedSignals;

function resetState() {
    winInjections = { };
    workspaceInjections = { };
    workViewInjections = { };
    createdActors = [ ];
    connectedSignals = [ ];
}

function enable() {
    resetState();

    WorkspacesView.WorkspacesView.prototype._onKeyPress = function(s, o) {
        
        if(o.get_key_symbol() == Clutter.KEY_Down){
        	let workspace = this._workspaces[(global.screen.get_active_workspace_index()+1)%this._workspaces.length];
            if (workspace !== undefined)
                workspace.metaWorkspace.activate(global.get_current_time());
        }
        if(o.get_key_symbol() == Clutter.KEY_Up){
        	let index = global.screen.get_active_workspace_index()-1;
        	if (index < 0) index = this._workspaces.length-1;
        	let workspace = this._workspaces[index];
            if (workspace !== undefined)
                workspace.metaWorkspace.activate(global.get_current_time());
        }
        if (o.get_key_symbol() == Clutter.KEY_Return){
        	Main.overview.hide();
        }

        return false;
    }
    workViewInjections['_onKeyPress'] = undefined;

    workViewInjections['_init'] = injectToFunction(WorkspacesView.WorkspacesView.prototype, '_init', function(width, height, x, y, workspaces) {
        this._keyPressEventId = global.stage.connect('key-press-event', Lang.bind(this, this._onKeyPress));
        connectedSignals.push({ obj: global.stage, id: this._keyPressEventId });
    });

    workViewInjections['_onDestroy'] = injectToFunction(WorkspacesView.WorkspacesView.prototype, '_onDestroy', function() {
        global.stage.disconnect(this._keyPressEventId);
        connectedSignals = [ ];
    });
}

function removeInjection(object, injection, name) {
    if (injection[name] === undefined)
        delete object[name];
    else
        object[name] = injection[name];
}

function disable() {
    for (i in workspaceInjections)
        removeInjection(Workspace.Workspace.prototype, workspaceInjections, i);
    for (i in winInjections)
        removeInjection(Workspace.WindowOverlay.prototype, winInjections, i);
    for (i in workViewInjections)
        removeInjection(WorkspacesView.WorkspacesView.prototype, workViewInjections, i);

    for each (i in connectedSignals)
        i.obj.disconnect(i.id);

    for each (i in createdActors)
        i.destroy();

    resetState();
}

function init() {
    /* do nothing */
}
