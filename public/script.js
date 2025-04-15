import { ref, remove, update, push, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";


let markerSize = 1.2;  // 可动态调整的图标大小
let draggedElementIndex = null;  // 当前被拖拽的标志物


// const mapContainer = document.getElementById('map-container');
const markerPalette = document.getElementById('marker-palette');

// 获取 Firebase 实时数据库引用
const dbRef = ref(window.database, 'markers');
const dbCurveRef = ref(window.database, 'curves');
let curveColor = '#FF0000FF'

// 定义图片数组，假设图片在 "images/items" 子文件夹中
const markers = [
    { src: 'images/items/Branches.png', alt: 'Branches' },
    { src: 'images/items/FibreHeavy.png', alt: 'FibreHeavy' },
    { src: 'images/items/Cassiterite.png', alt: 'Cassiterite' },
    { src: 'images/items/Malachite.png', alt: 'Malachite' },
    { src: 'images/items/Stone.png', alt: 'Stone' },
    { src: 'images/items/Iron.png', alt: 'Iron' },
    { src: 'images/items/Coal.png', alt: 'Coal' },
    { src: 'images/items/Resin.png', alt: 'Resin' },
    { src: 'images/items/Plunder.png', alt: 'Plunder' },
    { src: 'images/items/Bear.png', alt: 'Bear' },
    { src: 'images/items/Base.png', alt: 'Base' },
    { src: 'images/items/Bridge.png', alt: 'Bridge' },
    { src: 'images/items/Berry.png', alt: 'Berry' },
    { src: 'images/items/Deer.png', alt: 'Deer' },
    { src: 'images/items/Rabbit.png', alt: 'Rabbit' },
    { src: 'images/items/Boar.png', alt: 'Boar' },
    { src: 'images/items/Raven.png', alt: 'Raven' },
    { src: 'images/items/Wolf.png', alt: 'Wolf' },
];

// 动态生成并添加标志物图片
markers.forEach((marker, index) => {
    const img = document.createElement('img');
    img.src = marker.src;
    img.alt = marker.alt;
    img.className = 'marker';
    img.draggable = true;
    img.style.width = '100px';  // 调色板中标志物的默认大小
    img.style.height = '100px';
    img.index = index
    img.id = `marker-${index}`;  // 为每个标志物添加唯一的ID
    markerPalette.appendChild(img);
});

const fCanvas = new fabric.Canvas('canvas', {
    backgroundColor: '#443C31FF',
    fireRightClick: true, // 启用右键，button的数字为3
    stopContextMenu: true, // 禁止默认右键菜单,
    selection: false
})
fabric.Image.fromURL(
  'images/Map.png',
  (img) => {
      // 设置背景图
      fCanvas.setBackgroundImage(
        img,
        fCanvas.renderAll.bind(fCanvas),
        {
            left: 200,
            scaleX: 0.2,
            scaleY: 0.2
        }
      )
  }
)


fCanvas.on('mouse:wheel', opt => {
    let delta = opt.e.deltaY // 滚轮向上滚一下 ~= -100，向下滚一下 ~= 100
    let zoom = fCanvas.getZoom() // 获取画布当前缩放值

    // 控制缩放范围在 0.5~200 的区间内
    zoom *= 0.9995 ** delta
    if (zoom > 200) zoom = 200
    if (zoom < 0.5) zoom = 0.5

    // 设置画布缩放比例
    fCanvas.zoomToPoint(
      {
          x: opt.e.offsetX,
          y: opt.e.offsetY
      },
      zoom
    )
})

fCanvas.on('mouse:down', opt => { // 鼠标按下时触发
    if (opt.button === 3) {
        const e = opt.e
        fCanvas.isDragging = true // isDragging 是自定义的，开启移动状态
        fCanvas.lastPosX = e.clientX // lastPosX 是自定义的
        fCanvas.lastPosY = e.clientY // lastPosY 是自定义的
    }
})

fCanvas.on('mouse:move', opt => { // 鼠标移动时触发
    if (fCanvas.isDragging) {
        const e = opt.e
        const vpt = fCanvas.viewportTransform // 聚焦视图的转换
        vpt[4] += e.clientX - fCanvas.lastPosX
        vpt[5] += e.clientY - fCanvas.lastPosY
        fCanvas.requestRenderAll() // 重新渲染
        fCanvas.lastPosX  = e.clientX
        fCanvas.lastPosY  = e.clientY
    }
})

fCanvas.on('mouse:up', opt => { // 鼠标松开时触发
    fCanvas.setViewportTransform(fCanvas.viewportTransform) // 设置此画布实例的视口转换
    fCanvas.isDragging = false // 关闭移动状态
})

// 从调色板拖拽时创建新标志物
markerPalette.addEventListener('dragstart', (e) => {
    draggedElementIndex = e.target.index
});

fCanvas.on('drop', function(opt) {  // 鼠标坐标转换成画布的坐标（未经过缩放和平移的坐标）
    if (draggedElementIndex === null)
        return
    let point = {
        x: opt.e.x - fCanvas.getSelectionElement().getBoundingClientRect().left,
        y: opt.e.y - fCanvas.getSelectionElement().getBoundingClientRect().top,
    }
    // 转换后的坐标，restorePointerVpt 不受视窗变换的影响
    let pointerVpt = fCanvas.restorePointerVpt(point)
    const marker = {
        src: markers[draggedElementIndex].src,
        x: pointerVpt.x - markerSize / 2,
        y: pointerVpt.y - markerSize / 2,
    };
    push(dbRef, marker);
})

document.onkeydown = (e) => {
    if (e.key === '2') {
        fCanvas.freeDrawingBrush = new fabric.PencilBrush(fCanvas)
        fCanvas.freeDrawingBrush.color = curveColor
        fCanvas.isDrawingMode = true
    } else if (e.key === '1') {
        fCanvas.isDrawingMode = false
    }
}

fCanvas.on('path:created', (opt) => {
    push(dbCurveRef, {
        json: JSON.stringify(opt.path.toJSON()),
        x: opt.path.get('left'),
        y: opt.path.get('top'),
        color: opt.path.get('stroke')
    });
    fCanvas.remove(opt.path)
})

fCanvas.on('object:moving', opt => {
    if (opt.target.key) {
        if (opt.target.get('type') === 'image') {
            const markerRef = ref(window.database, `markers/${opt.target.key}`);
            update(markerRef, { x: opt.target.left, y: opt.target.top }).then(() => {
                console.log(`Marker position updated in Firebase`);
            }).catch((error) => {
                console.error(`Error updating marker position in Firebase:`, error);
            });
        } else if (opt.target.get('type') === 'path') {
            const curveRef = ref(window.database, `curves/${opt.target.key}`);
            update(curveRef, { x: opt.target.left, y: opt.target.top }).then(() => {
                console.log(`Curve position updated in Firebase`);
            }).catch((error) => {
                console.error(`Error updating curve position in Firebase:`, error);
            });
        }
    }
})

fCanvas.on('mouse:dblclick', opt => { // 鼠标按下时触发
    if (opt.target) {
        if (opt.target.key) {
            if (opt.target.get('type') === 'image') {
                const markerRef = ref(window.database, `markers/${opt.target.key}`);
                remove(markerRef).then(() => {
                    console.log(`Marker with key ${opt.target.key} removed from Firebase`);
                }).catch((error) => {
                    console.error(`Error removing marker from Firebase:`, error);
                });
            } else if (opt.target.get('type') === 'path') {
                const curveRef = ref(window.database, `curves/${opt.target.key}`);
                remove(curveRef).then(() => {
                    console.log(`Curve with key ${opt.target.key} removed from Firebase`);
                }).catch((error) => {
                    console.error(`Error removing curve position in Firebase:`, error);
                });
            }
        } else {
            fCanvas.remove(opt.target)
        }
    }
})

//从firebase加载并显示标志物
onChildAdded(dbRef, (snapshot) => {
    const marker = snapshot.val();
    const key = snapshot.key;
    fabric.Image.fromURL(marker.src, img => {
        img.left = marker.x
        img.top = marker.y
        img.scale(markerSize / img.height)
        img.hasControls = false
        img.key = key;  // 保存 Firebase 的 key
        fCanvas.add(img) // 将图片加入到画布
    })
});

let CD = false

// 监听实时数据变化，更新标志物的位置
onChildChanged(dbRef, (snapshot) => {
    const marker = snapshot.val();
    const key = snapshot.key;
    fCanvas.getObjects().forEach((item) => {
        if (item.key === key) {
            item.left = marker.x
            item.top = marker.y
        }
    })
    if (!CD) {
        CD = true
        fCanvas.requestRenderAll()
        setTimeout(() => {
            CD = false
        }, 10)
    }
});

// 监听标志物的删除事件，移除标志物
onChildRemoved(dbRef, (snapshot) => {
    const key = snapshot.key;
    fCanvas.getObjects().forEach((item) => {
        if (item.key === key) {
            fCanvas.remove(item)
        }
    })
});

onChildAdded(dbCurveRef, (snapshot) => {
    const curve = snapshot.val();
    const key = snapshot.key;
    const path = new fabric.Path(curve.json)
    fCanvas.add(path.set({
        left: curve.x,
        top: curve.y,
        stroke: curve.color,
        fill: 'transparent',
        hasControls: false,
        key: key
    }))
});

onChildChanged(dbCurveRef, (snapshot) => {
    const curve = snapshot.val();
    const key = snapshot.key;
    fCanvas.getObjects().forEach((item) => {
        if (item.key === key) {
            item.left = curve.x
            item.top = curve.y
        }
    })
    if (!CD) {
        CD = true
        fCanvas.requestRenderAll()
        setTimeout(() => {
            CD = false
        }, 10)
    }
    fCanvas.requestRenderAll()
});

onChildRemoved(dbCurveRef, (snapshot) => {
    const key = snapshot.key;
    fCanvas.getObjects().forEach((item) => {
        if (item.key === key) {
            fCanvas.remove(item)
        }
    })
});

document.getElementById('color-palette').onchange = function() {
    curveColor = this.jscolor.toHEXAString();
    fCanvas.freeDrawingBrush = new fabric.PencilBrush(fCanvas)
    fCanvas.freeDrawingBrush.color = curveColor
}

jscolor.trigger('change');
