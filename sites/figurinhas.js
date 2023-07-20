
function consultaFigurinhas(){
    let div_imagens = document.getElementById("div_imagens")
    console.log("Bora");
    div_imagens.innerHTML = ""
    fetch("/figurinhas").then( (data)=> data.json()).then( (data)=> {

    data.chunk(5).forEach(lista => {
        let html = '<div>'
        div_imagens.innerHTML = div_imagens.innerHTML + ``
        lista.forEach(element => {
            html = html + `<div><label>${element.split(".")[0]}</label><div class='div-image'><img src="/images/figurinhas/${element}" alt="" srcset=""/></div></div>`
        }); 
        html = html + `</div>`
        div_imagens.innerHTML = div_imagens.innerHTML + html
    });
       
        
    }).catch(() => {})
}

Object.defineProperty(Array.prototype, 'chunk', {
    value: function(chunkSize) {
        var R = [];
        for (var i = 0; i < this.length; i += chunkSize)
        R.push(this.slice(i, i + chunkSize));
        return R;
    }
});

consultaFigurinhas()