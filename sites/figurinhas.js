
function consultaFigurinhas(){
    let div_imagens = document.getElementById("div_imagens")
    console.log("Bora");
    div_imagens.innerHTML = ""
    fetch("http://localhost:3001/figurinhas/all").then( (data)=> data.json()).then( (data)=> {

    data.chunk(5).forEach(lista => {
        let html = '<div>'
        div_imagens.innerHTML = div_imagens.innerHTML + ``
        lista.forEach(element => {
            html = html + `<div><label>${element}</label><img src="http://localhost:3001/figurinhas/${element}" alt="" srcset=""/></div>`
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