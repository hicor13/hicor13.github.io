class Header extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <style>
      .nav_style2{
        font-size: 20px;
        background-color: #1E291E;
        float: left;
        width: 100%;
        padding-top:15px;
        padding-bottom: 15px;
        margin:0;
        text-decoration: none;
        position: relative;
        -webkit-user-select: none;  /* Chrome all / Safari all */
        -moz-user-select: none;     /* Firefox all */
        -ms-user-select: none;      /* IE 10+ */
        user-select: none;          /* Likely future */  
    }
    .nav_master{
        width: max-content;
        margin-left: 50%;
        transform: translate(-50%);
    }
    .nav_master div{ 
        width: auto;
        float: left;
        text-align: center;
        color:white;
        border-radius: 5px;
        padding-top: 10px;
        padding-bottom: 10px;
        margin-bottom: 0px;
        padding-left: 25px;
        padding-right: 25px;
        margin-left: 4px;
        margin-right: 4px;
    }
    div.nav_hl2{
        color:white;
        background-color: #141A14;
        cursor: default;
    }
    div.nav_home2:hover{
        color:white;
        background-color: black;
        transition: 0.3s;
    }
    div.nav_normal:hover{
        transition: 0.8s;
        color:#1E291E;
        animation-duration: 0.3s;
        background-color: white;
    }
     
    }
      </style>
      <header>
      <nav>
        <div class="nav_style2">
          <div class="nav_master">         
            <a style="display: contents" href="/">
              <div class="nav_home2" title="Inicio" id="Inicio_">Inicio</div>
            </a>
            <a style="display: contents" href="/sections/projects/">
              <div class="nav_normal" title="Proyectos" id="Proyectos_">Proyectos</div>
            </a>
            <a style="display: contents" href="/sections/info/">
              <div class="nav_normal"title="Información" id="Información_">Información</div>
            </a>
            <a style="display: contents" href="/sections/blog/">
              <div class="nav_normal" title="Blog" id="Blog_">Blog</div>
            </a>
            <a style="display: contents" href="/sections/gallery/">
              <div class="nav_normal" title="Galería" id="Galería_">Galería</div>
            </a>
          </div>
        </div>                  
      </nav> 
    </header>

    `;
  }
}

customElements.define('header-component', Header);


class Footer extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <style>
       
        footer{
     
          width: 100%;
          position : absolute;
          bottom : 0;
          height : fit-contents;
          margin-top : 40px;
          -webkit-user-select: none;  /* Chrome all / Safari all */
          -moz-user-select: none;     /* Firefox all */
          -ms-user-select: none;      /* IE 10+ */
          user-select: none;          /* Likely future */  
        }
        .link_mc{
          color:white;
          font-weight: bold;
        }
        .pie{
          font-family: 'Segoe UI';
          font-size: 13px;
          text-align: center;
          box-sizing: border-box;
          padding-top: 30px;
          padding-bottom: 30px;  
          background-color: #3F5344;
          margin-top: 0px;
        }
        .pie p, a{
          margin-top: 10px;
          color: white;
          text-decoration: none;
        }
        .img_DMCA{
          margin-top: 10px;
        }
        @media screen and (max-device-height:480px){
          .header_style{
              padding-top: 75px;
              padding-left: 20px;
          }
          .header_style h1{
              font-size: 30px;
          }
          .header_style p{
              font-size: 14px;
          }
          .header_right{
              width: 40%;
          }
        }
      </style>
      <footer class="pie">
        <p><a href="https://www.youtube.com/watch?v=62UVc759fzY" title="?????????????????????????????????????????????????????????????????????????????????" style="cursor: default;">Elaborado por Mario Cornejo</a></p>
        <p></p>
        <a href="mailto:hicor13@gmail.com" title="Mi correo electónico personal">hicor13@gmail.com</a>
        <section>
          <p><i>Desarrollado en HTML5 y CSS</i></p>
          <p>© 2021 · <a href="http://mariocornejo.com" title="La mejor página web del mundo">mariocornejo.com</a></p>
         <p>
         </p>
          <a href="http://#" title="Más información">Más información</a>
        </section>   
        <div class="img_DMCA">
            <a  id="DMCA-size" href="//www.dmca.com/Protection/Status.aspx?ID=6d932773-66c8-4ffb-95ae-71fa2cef3bdf" title="DMCA.com Protection Status" class="dmca-badge"> 
              <img src ="https://images.dmca.com/Badges/dmca_protected_sml_120n.png?ID=6d932773-66c8-4ffb-95ae-71fa2cef3bdf"  alt="DMCA.com Protection Status" />
            </a>
        </div>
      </footer> 
    `;
  }
}

customElements.define('footer-component', Footer);



