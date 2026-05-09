// протестирован
function checkLastRow(mode, replaced) {
  const endGroup = document.getElementById('endGroup');
  const presolve = (getRowData('count')<MOBILE_TARGET_ROW);
  const baseWidth = buttonContainer.parentNode.clientWidth - 15;

  function applyGroupStyle(state = "reset") { // or "expand"
    if(state === "expand"){
      endGroup.style.flex = "1 0 100%"; 
      endGroup.style.marginLeft = "0";
      endGroup.style.justifyContent = "space-between";
    }
    if(state === "reset"){
      endGroup.style.flex = "";
      endGroup.style.marginLeft = ""; 
      endGroup.style.justifyContent = "";
    }
  }
  
  function textCorrection() { 
    console.log("[checkLast-Row][textCorrect]", baseWidth, endGroup.offsetWidth)
    const btnToShorten = endGroup.children[0];
    const originalText = btnToShorten.dataset.original || btnToShorten.textContent.trim();
    btnToShorten.dataset.original = originalText;
    if (originalText.length > 4) {
        btnToShorten.textContent = originalText.substring(0, 4) + "..";
    }
  }

  function applyFix(items, mode = "line") {
    if (!endGroup) return false;
    let targets = [];

    if (mode === "line") {
      targets = items.filter(el => el !== endGroup && el.id !== 'firstBtn' && el.id !== 'obtn');
    } else {
      targets = Array.from(buttonContainer.querySelectorAll('button'))
        .filter(btn => btn.id !== 'firstBtn' && btn.id !== 'obtn' && !endGroup.contains(btn) && btn.innerText.length > 2);
    }

    if (targets.length === 0){
      console.log("[Fix Failure] КАНДИДАТОВ НЕТ");
      return false;
    }

    if (mode === "mobile") {
      targets.sort((a, b) => a.innerText.length - b.innerText.length);
      const bestBuddy = targets[0];
      const ghost = bestBuddy.cloneNode(true);
      
      // гост, что сетка не поехала
      ghost.id = ""; 
      ghost.dataset.ghost = "true"; 
      ghost.classList.add('btn_ghost');
      
      bestBuddy.parentNode.insertBefore(ghost, bestBuddy);
      endGroup.prepend(bestBuddy);

    } else { // Режим RESULT: работаем со всеми соседями
      [...targets].reverse().forEach(el => endGroup.prepend(el));
    }

    applyGroupStyle("expand");

    if(!isMobile) return true

    const currentCount = getRowData('count');

    if ( currentCount !== MOBILE_TARGET_ROW  ) { 
      console.log(`[checkLast-Row][FixFailure] Нарушена сетка! Рядов: ${currentCount}. Откатываем...`);

      if (currentCount > MOBILE_TARGET_ROW) {

        for (let j = 0; j < 3; j++) {
          const locks = Array.from(buttonContainer.querySelectorAll('button[data-st="lock"]'))
            .filter(btn => !['firstBtn', 'preBtn', 'lastBtn', 'obtn'].includes(btn.id) && !endGroup.contains(btn));
          
          if (locks.length > 0) {
            locks[locks.length - 1].remove();
            if (getRowData('count') === MOBILE_TARGET_ROW) {
              console.log(`[checkLast-Row][Success] Сетка восстановлена до ${MOBILE_TARGET_ROW} строк`);
              return true;
            } 
          }
        }
      }else if (currentCount < MOBILE_TARGET_ROW) {
        console.log(`[checkLast-Row] Рядов мало (${currentCount}). Восстанавливаем из группы...`);
        
        // Берем кнопки из группы (кроме системных и кроме той, что мы принудительно фиксили)
        const candidates = Array.from(endGroup.querySelectorAll('button:not(#preBtn):not(#lastBtn)'))
          .filter(btn => btn !== replaced); // replaced мы НЕ трогаем, он должен остаться!

        for (let btn of candidates) {
          buttonContainer.insertBefore(btn, endGroup);
          
          if (getRowData('count') === MOBILE_TARGET_ROW) {
            console.log(`[checkLast-Row][Success] Сетка восстановлена (ряд добавлен)`);
            return true;
          }
        }
      }

      // Если удаление lock-кнопок выше не помогло (работает с гостами на ините)
      console.log(`[checkLast-Row][FixFailure] Не удалось спасти ${MOBILE_TARGET_ROW} строк. ОТКАТЫВАЕМ изменения.`);
      const buddyInGroup = endGroup.querySelector('button:not(#preBtn):not(#lastBtn)');
      const ghost = Array.from(buttonContainer.children).find(el => el.dataset.ghost === "true");

      if (buddyInGroup && ghost) {
        ghost.replaceWith(buddyInGroup); 
        console.log(`[checkLast-Row][Rollback] Кнопка ${buddyInGroup.id} вернулась на базу.`);
      } else if (mode === "line") {
        // Добавляем .reverse(), чтобы вернуть кнопки в правильном порядке
        const neighbours = Array.from(endGroup.querySelectorAll('button:not(#preBtn):not(#lastBtn)'));
        neighbours.reverse().forEach(btn => buttonContainer.insertBefore(btn, endGroup));
      }

      applyGroupStyle("reset"); // до дефолтного
      return false; 
    }

    return true;
  }

  let currentRows = getRowData('count'); 
  let rowItems = getRowData('items'); 

  let nItems = rowItems.length; console.log("[checkLast-Row] Count on LastRow:", nItems, "elems");
  
  if (nItems === 1 && isMobile) {
    console.log("[checkLast-Row][Mode] Mobile with ghost")
    applyFix(rowItems, "mobile")
    mergeFromCheck = true;
    return
  } 

  // REORIENT LOGIC (WORK 100 %)
  if (mode==="force"){ // используется пре reorient
    console.log("[checkLast-Row][FORCE] Start");
    endGroup.prepend(replaced);  // сразу закидываем replace в end группу 

    if (currentRows < MOBILE_TARGET_ROW) {
        const visibleButtons = new Set(
            Array.from(buttonContainer.querySelectorAll('button'))
                .map(b => b.dataset.href).filter(Boolean)
        );

        // Берем только те, что реально скрыты и не являются системными
        const candidatesToRestore = SOURCE_BUTTONS.filter(src => 
            src.dataset.href && 
            !visibleButtons.has(src.dataset.href) &&
            !['firstBtn', 'obtn'].includes(src.id) &&
            !endGroup.contains(src)
        );

        for (const srcBtn of candidatesToRestore) {
            const clone = srcBtn.cloneNode(true);
            buttonContainer.insertBefore(clone, endGroup);
            
            let nextRows = getRowData('count');
            if (nextRows <= MOBILE_TARGET_ROW) {
                if (unlockHeart) {
                    const g = clone.dataset.g;
                    if (["D", "W", "B"].includes(g)) clone.classList.add('dstate');
                }
                currentRows = nextRows;
                console.log("[checkLast-Row][FORCE][Restore]", clone.dataset.href, "Rows:", currentRows);
            } else {
                clone.remove();
                break;
            }
        }
    }

    currentRows = getRowData('count');
    if (currentRows > MOBILE_TARGET_ROW) {
        console.log("[checkLast-Row][FORCE][removing]");
        
        const allowedForDeletion = Array.from(buttonContainer.children).filter(b => {
            const isAllowedSource = b !== endGroup && b.id !== 'firstBtn'; 
            const isTargetType = b.dataset.st === "lock" || b.dataset.g === "W";
            return isAllowedSource && isTargetType;
          });

        while (allowedForDeletion.length > 0 && getRowData('count') > MOBILE_TARGET_ROW) {
            const btn = allowedForDeletion.pop();
            console.log("[checkLast-Row][FORCE][removing]", btn.dataset.href);
            btn.remove();
        }
    }

    currentRows = getRowData('count'); 
    rowItems = getRowData('items'); 

    if (currentRows > MOBILE_TARGET_ROW) return applyGroupStyle("reset")

    if (currentRows === MOBILE_TARGET_ROW) {
        // Если есть соседи — всасываем их в группу
        const elementsToMove = rowItems.filter(item => item !== endGroup);
        elementsToMove.forEach(item => { endGroup.prepend(item); });
    }

    if (rowItems.length === 1 && endGroup.children.length === 3) {
        // Фикс текста, если группа одна на строке и там три элемента
        if (endGroup.offsetWidth > (baseWidth)) textCorrection();
    }

    console.log("[checkLast-Row][FORCE][DONE]", currentRows);
    
    return applyGroupStyle("expand")
  }

  // BASE ON INIT LOGIC (WORK 100 %)
  for (let i = 0; i < 3; i++) {
    rowItems = getRowData('items'); 
    nItems = rowItems.length;
  
    if (nItems === 1) {
      const bFoDelete = Array.from(buttonContainer.querySelectorAll('button[data-st="lock"]'))
        .filter(btn => !['preBtn', 'lastBtn', 'firstBtn', 'obtn'].includes(btn.id) && !endGroup.contains(btn));

      if (bFoDelete.length === 0) {
        console.log("[checkLast-Row][Mode] Нет данных для удаления")
        applyFix(rowItems);
        break;
      }
      
      bFoDelete[bFoDelete.length - 1].remove();
      buttonContainer.offsetHeight;

    } else {
      console.log("[checkLast-Row][Mode] MergeAll Elements to one endGroup")
      applyFix(rowItems);
      break;
    }
  }

  console.log("[checkLast-Row][Complete]")
}

// не до конца протестирован
function checkLastRowRef(mode, replaced) {
  const endGroup = document.getElementById('endGroup');
  const baseWidth = buttonContainer.parentNode.clientWidth - 15;

  const api = {
    count: () => getRowData('count'),
    items: () => getRowData('items'),
    style: state => {
      const e = state === "expand";
      endGroup.style.flex = e ? "1 0 100%" : "";
      endGroup.style.marginLeft = e ? "0" : "";
      endGroup.style.justifyContent = e ? "space-between" : "";
    },
    locks: () => [...buttonContainer.querySelectorAll('button[data-st="lock"]')]
      .filter(b => !['firstBtn','preBtn','lastBtn','obtn'].includes(b.id) && !endGroup.contains(b))
  };

  function textCorrection() { 
    const btnToShorten = endGroup.children[0];
    const originalText = btnToShorten.dataset.original || btnToShorten.textContent.trim();
    btnToShorten.dataset.original = originalText;
    if (originalText.length > 4) {
        btnToShorten.textContent = originalText.substring(0, 4) + "..";
    }
  }

  function applyFix(items, mode = "line") {
    if (!endGroup) return false;

    const targets = mode === "line"
      ? items.filter(el => el !== endGroup && !['firstBtn','obtn'].includes(el.id))
      : [...buttonContainer.querySelectorAll('button')]
          .filter(btn => btn.id !== 'firstBtn' && btn.id !== 'obtn' && !endGroup.contains(btn) && btn.innerText.length > 2);

    if (!targets.length) return console.log("[Fix Failure] КАНДИДАТОВ НЕТ"), false;

    if (mode === "mobile") {
      const bestBuddy = targets.sort((a,b)=>a.innerText.length-b.innerText.length)[0],
            ghost = bestBuddy.cloneNode(true);

      ghost.id = "";
      ghost.dataset.ghost = "true";
      ghost.classList.add('btn_ghost');

      bestBuddy.parentNode.insertBefore(ghost, bestBuddy);
      endGroup.prepend(bestBuddy);

    } else [...targets].reverse().forEach(el => endGroup.prepend(el));

    api.style("expand"); if (!isMobile) return true;

    const currentCount = api.count();
    if (currentCount === TEMP_TARGET_ROW) return true;

    console.log(`[checkLastRow][FixFailure] Нарушена сетка! Рядов: ${currentCount}`);

    if (currentCount > TEMP_TARGET_ROW) {

      for (let j = 0; j < 3; j++) {
        const locks = api.locks();
        if (!locks.length) break;

        locks.at(-1).remove();

        if (api.count() === TEMP_TARGET_ROW)
          return console.log(`[checkLastRow][Success] Сетка восстановлена`), true;
      }

    } else {
      console.log(`[checkLastRow] Рядов мало (${currentCount})`);

      const candidates = [...endGroup.querySelectorAll('button:not(#preBtn):not(#lastBtn)')]
        .filter(btn => btn !== replaced);

      for (const btn of candidates) {
        buttonContainer.insertBefore(btn, endGroup);

        if (api.count() === TEMP_TARGET_ROW)
          return console.log(`[checkLastRow][Success] Ряд восстановлен`), true;
      }
    }

    console.log(`[checkLastRow][Rollback]`);
    const buddyInGroup = endGroup.querySelector('button:not(#preBtn):not(#lastBtn)'),
          ghost = [...buttonContainer.children].find(el => el.dataset.ghost === "true");

    if (buddyInGroup && ghost) ghost.replaceWith(buddyInGroup);
    else if (mode === "line")
      [...endGroup.querySelectorAll('button:not(#preBtn):not(#lastBtn)')]
        .reverse()
        .forEach(btn => buttonContainer.insertBefore(btn, endGroup));

    api.style("reset");
    return false;
  }

  let currentRows = api.count(), rowItems = api.items();

  // reorient
  if (mode === "force") {
    console.log("[checkLastRow][FORCE] Start");
    endGroup.prepend(replaced);

    if (currentRows < TEMP_TARGET_ROW) {
      const visibleButtons = new Set(
        [...buttonContainer.querySelectorAll('button')]
          .map(b => b.dataset.href)
          .filter(Boolean)
      );

      const candidatesToRestore = SOURCE_BUTTONS.filter(src =>
        src.dataset.href &&
        !visibleButtons.has(src.dataset.href) &&
        !['firstBtn','obtn'].includes(src.id) &&
        !endGroup.contains(src)
      );

      for (const srcBtn of candidatesToRestore) {
        const clone = srcBtn.cloneNode(true);
        buttonContainer.insertBefore(clone, endGroup);

        const nextRows = api.count();

        if (nextRows <= TEMP_TARGET_ROW) {

          if (unlockHeart) {
            const g = clone.dataset.g;
            if (["D","W","B"].includes(g)) clone.classList.add('dstate');
          }

          currentRows = nextRows;
          console.log("[checkLastRow][FORCE][Restore]", clone.dataset.href, "Rows:", currentRows);

        } else {
          clone.remove();
          break;
        }
      }
    }

    currentRows = api.count();

    if (currentRows > TEMP_TARGET_ROW) {
      console.log("[checkLastRow][FORCE][Removing]");

      const allowedForDeletion = [...buttonContainer.children]
        .filter(b =>
          b !== endGroup &&
          b.id !== 'firstBtn' &&
          (b.dataset.st === "lock" || b.dataset.g === "W")
        );

      while (allowedForDeletion.length && api.count() > TEMP_TARGET_ROW) {
        const btn = allowedForDeletion.pop();
        console.log("[checkLastRow][FORCE][Removing]", btn.dataset.href);
        btn.remove();
      }
    }

    currentRows = api.count();
    rowItems = api.items();

    if (currentRows > TEMP_TARGET_ROW) return api.style("reset");
    if (currentRows === TEMP_TARGET_ROW) {
        rowItems.filter(item => item !== endGroup).forEach(item => endGroup.prepend(item));
    }

    if (rowItems.length === 1 && endGroup.children.length === 3) {
        if (endGroup.offsetWidth > (baseWidth)) textCorrection();
    }

    console.log("[checkLastRow][FORCE][DONE]");
    return api.style("expand");
  }

  let nItems = rowItems.length;
  console.log("[checkLastRow] Count on LastRow:", nItems, "elems");

  if (nItems === 1 && isMobile)
    return console.log("[checkLastRow][Mode] Mobile"),
      applyFix(rowItems, "mobile"),
      mergeFromCheck = true;

  for (let i = 0; i < 3; i++) {
    rowItems = api.items();
    nItems = rowItems.length;

    if (nItems === 1) {
      const bFoDelete = api.locks();

      if (!bFoDelete.length) { console.log("[checkLastRow][Mode] Merge");
        applyFix(rowItems);
        break;
      }

      bFoDelete.at(-1).remove();
      buttonContainer.offsetHeight;

    } else { console.log("[checkLastRow][Mode] Merge all");
      applyFix(rowItems);
      break;
    }
  }

  console.log("[checkLastRow][Complete]");
}

// даёт ошибки
function checkLastRowHard(mode, replaced) { 
  const endGroup = document.getElementById('endGroup'), 
        cont = buttonContainer, 
        target = TEMP_TARGET_ROW;
  if (!endGroup) return;

  const getC = () => getRowData('count'),
        getI = () => getRowData('items'),
        isSys = b => ['firstBtn','preBtn','lastBtn','obtn'].includes(b.id) || b.dataset.ghost,
        isMove = b => !isSys(b) && !endGroup.contains(b),
        setStyle = s => {
          const e = s === "expand";
          endGroup.style.flex = e ? "1 0 100%" : "";
          endGroup.style.marginLeft = endGroup.style.justifyContent = e ? "0" : "";
          if (e) endGroup.style.justifyContent = "space-between";
        };

  function fix(items, isMob = false) {
    let tg = isMob ? [[...cont.querySelectorAll('button')].filter(b => isMove(b) && b.innerText.length > 2).sort((a,b)=>a.innerText.length-b.innerText.length)[0]]
                   : items.filter(el => el !== endGroup && !isSys(el));
    
    tg = tg.filter(Boolean); if (!tg.length) return false;

    if (isMob) {
      const g = tg[0].cloneNode(true); g.id = ""; g.dataset.ghost = "true"; g.classList.add('btn_ghost');
      tg[0].parentNode.insertBefore(g, tg[0]);
    }

    [...tg].reverse().forEach(el => endGroup.prepend(el));
    setStyle("expand");

    if (isMobile && getC() !== target) {
      if (getC() > target) {
        for (let j = 0; j < 3; j++) {
          const l = [...cont.querySelectorAll('button[data-st="lock"]')].filter(isMove);
          if (l.length) { l.at(-1).remove(); if (getC() === target) return true; }
        }
      } else {
        const c = [...endGroup.querySelectorAll('button:not(#preBtn):not(#lastBtn)')].filter(b => b !== replaced);
        for (const b of c) { cont.insertBefore(b, endGroup); if (getC() === target) return true; }
      }
      const bdy = endGroup.querySelector('button:not(#preBtn):not(#lastBtn)'), gh = [...cont.children].find(e => e.dataset.ghost === "true");
      if (isMob && bdy && gh) gh.replaceWith(bdy);
      else if (!isMob) [...tg].reverse().forEach(b => cont.insertBefore(b, endGroup));
      setStyle("reset"); return false;
    }
    return true;
  }

  if (mode === "force") {
    endGroup.prepend(replaced);

    if (getC() < target) {
      const vis = new Set([...cont.querySelectorAll('button')].map(b => b.dataset.href).filter(Boolean));
      for (const s of SOURCE_BUTTONS) {
        if (!s.dataset.href || vis.has(s.dataset.href) || isSys(s) || endGroup.contains(s)) continue;
        const c = s.cloneNode(true); cont.insertBefore(c, endGroup);
        if (getC() <= target) { if (unlockHeart && ["D","W","B"].includes(c.dataset.g)) c.classList.add('dstate'); }
        else { c.remove(); break; }
      }
    }

    if (getC() > target) {
      const al = [...cont.children].filter(b => b !== endGroup && b.id !== 'firstBtn' && (b.dataset.st === "lock" || b.dataset.g === "W"));
      while (al.length && getC() > target) al.pop().remove();
    }

    if (getC() === target) {
      const rowItems = getI();
      rowItems.filter(b => b !== endGroup).forEach(b => endGroup.prepend(b));

      if (rowItems.length === 1 && endGroup.children.length === 3 && endGroup.offsetWidth > (cont.parentNode.clientWidth - 15)) {
        const b = endGroup.children[0], t = b.dataset.original ||= b.textContent.trim();
        if (t.length > 4) b.textContent = t.slice(0,4) + "..";
      }
    }

    return setStyle("expand");
  }

  let rI = getI();
  if (rI.length === 1 && isMobile) return fix(rI, true), mergeFromCheck = true;
  
  for (let i = 0; i < 3; i++) {
    rI = getI();
    if (rI.length === 1) {
      const l = [...cont.querySelectorAll('button[data-st="lock"]')].filter(isMove);
      if (!l.length) { fix(rI); break; }
      l.at(-1).remove(); cont.offsetHeight;
    } else { fix(rI); break; }
  }
}

// Вызовы судя по коду, force используется как для пк как базовый, т.к. обновление вообще не предусмотрено 

  if(mode === "reset"){ // onstart
    
    if(!isMobile){  
      const endGroup = document.getElementById('endGroup');
      const prevBtn = endGroup.previousElementSibling;
      checkLastRowRef("force", prevBtn);

    } else{
      checkLastRowRef(); 
    }
  }else{ // on update

    if (fixLogic && targetHREF) {
      const forcedBtn = Array.from(buttonContainer.children).find(b => b.dataset.href === targetHREF);
      checkLastRowRef("force", forcedBtn);
    } else {
      checkLastRowRef();
    }
  }
