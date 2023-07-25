const YEAR = new Date().getFullYear()

export default {
  footer: (
    <small style={{ display: 'block', marginTop: '0.5rem' }}>
      {/* Here's where we removed the year and copyright text */}
      <style jsx>{`
        a {
          float: right;
        }
        @media screen and (max-width: 480px) {
          article {
            padding-top: 0.2rem;
            padding-bottom: 0.2rem;
          }
        }
      `}</style>
    </small>
  )
}

